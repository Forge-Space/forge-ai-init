import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedStack } from '../types.js';
import type { CheckResult } from '../checker.js';

function fileExists(dir: string, ...paths: string[]): boolean {
  return existsSync(join(dir, ...paths));
}

function dirHasFiles(dir: string, ...paths: string[]): boolean {
  const full = join(dir, ...paths);
  if (!existsSync(full)) return false;
  try {
    return readdirSync(full).length > 0;
  } catch {
    return false;
  }
}

export function checkCi(dir: string, stack: DetectedStack): CheckResult[] {
  const results: CheckResult[] = [];

  const hasGhWorkflows = dirHasFiles(dir, '.github', 'workflows');
  const hasGitlabCi = fileExists(dir, '.gitlab-ci.yml');
  const hasCi = hasGhWorkflows || hasGitlabCi || stack.hasCi;

  results.push({
    name: 'CI/CD pipeline',
    status: hasCi ? 'pass' : 'fail',
    detail: hasCi
      ? `CI configured (${hasGhWorkflows ? 'GitHub Actions' : hasGitlabCi ? 'GitLab CI' : stack.ciProvider ?? 'detected'})`
      : 'No CI/CD — code ships without automated checks',
    category: 'ci',
    weight: 3,
  });

  if (hasGhWorkflows) {
    const wfDir = join(dir, '.github', 'workflows');
    try {
      const workflows = readdirSync(wfDir);
      const hasSecretScan = workflows.some(
        (f) => f.includes('secret') || f.includes('trufflehog') || f.includes('gitleaks'),
      );
      results.push({
        name: 'Secret scanning',
        status: hasSecretScan ? 'pass' : 'warn',
        detail: hasSecretScan
          ? 'Secret scanning workflow found'
          : 'No secret scanning in CI — leaked credentials may go undetected',
        category: 'ci',
        weight: 2,
      });

      const hasSecurity = workflows.some(
        (f) =>
          f.includes('security') ||
          f.includes('semgrep') ||
          f.includes('trivy') ||
          f.includes('codeql'),
      );
      results.push({
        name: 'Security scanning',
        status: hasSecurity ? 'pass' : 'warn',
        detail: hasSecurity
          ? 'Security scanning workflow found'
          : 'No SAST/SCA in CI — vulnerabilities may ship to production',
        category: 'ci',
        weight: 2,
      });
    } catch {
      // ignore read errors
    }
  }

  return results;
}
