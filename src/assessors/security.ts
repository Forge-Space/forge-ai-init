import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { AssessmentFinding, Severity } from './types.js';

export function collectSecurityFindings(
  dir: string,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];

  const gitignorePath = join(dir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.env')) {
      findings.push({
        category: 'security',
        severity: 'critical',
        title: '.env not gitignored',
        detail: '.env not excluded — secrets may be committed',
      });
    }
  } else {
    findings.push({
      category: 'security',
      severity: 'high',
      title: 'No .gitignore',
      detail: 'No .gitignore — all files may be committed',
    });
  }

  const secretPatterns: Array<{ re: RegExp; title: string; sev: Severity }> = [
    {
      re: /(?:password|secret|api_key|apiKey|token)\s*[:=]\s*["'`][^"'`]{4,}["'`]/gi,
      title: 'Hardcoded secret',
      sev: 'critical',
    },
    {
      re: /(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[0-9A-Z]{16}/g,
      title: 'AWS access key',
      sev: 'critical',
    },
    {
      re: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
      title: 'Private key in source',
      sev: 'critical',
    },
  ];

  const dangerousPatterns: Array<{
    re: RegExp;
    title: string;
    detail: string;
    sev: Severity;
  }> = [
    {
      re: /\beval\s*\(/g,
      title: 'eval() usage',
      detail: 'Code injection risk',
      sev: 'critical',
    },
    {
      re: /dangerouslySetInnerHTML/g,
      title: 'Unsafe HTML injection',
      detail: 'XSS risk — sanitize with DOMPurify',
      sev: 'high',
    },
    {
      re: /innerHTML\s*=/g,
      title: 'Direct innerHTML assignment',
      detail: 'XSS risk — use textContent or sanitize',
      sev: 'high',
    },
    {
      re: /\$\{.*\}\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
      title: 'SQL injection risk',
      detail: 'Template literal in SQL — use parameters',
      sev: 'critical',
    },
    {
      re: /cors\(\s*\)/g,
      title: 'Unrestricted CORS',
      detail: 'cors() with no options allows all origins',
      sev: 'high',
    },
  ];

  let secretCount = 0;
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const relPath = relative(dir, file);

    for (const sp of secretPatterns) {
      const regex = new RegExp(sp.re.source, sp.re.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (secretCount >= 10) break;
        const line = content.slice(0, match.index).split('\n').length;
        findings.push({
          category: 'security',
          severity: sp.sev,
          title: sp.title,
          detail: `Possible ${sp.title.toLowerCase()}`,
          file: relPath,
          line,
        });
        secretCount++;
      }
    }

    for (const dp of dangerousPatterns) {
      const regex = new RegExp(dp.re.source, dp.re.flags);
      if (regex.test(content)) {
        findings.push({
          category: 'security',
          severity: dp.sev,
          title: dp.title,
          detail: dp.detail,
          file: relPath,
        });
      }
    }
  }

  if (!existsSync(join(dir, 'SECURITY.md'))) {
    findings.push({
      category: 'security',
      severity: 'medium',
      title: 'No security policy',
      detail: 'No SECURITY.md — no disclosure process',
    });
  }

  return findings;
}
