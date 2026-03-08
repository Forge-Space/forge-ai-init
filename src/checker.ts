import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedStack } from './types.js';

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
  category: CheckCategory;
  weight: number;
}

export type CheckCategory =
  | 'rules'
  | 'skills'
  | 'hooks'
  | 'ci'
  | 'security'
  | 'quality'
  | 'policies';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AuditReport {
  checks: CheckResult[];
  score: number;
  grade: Grade;
  summary: CategorySummary[];
}

export interface CategorySummary {
  category: CheckCategory;
  passed: number;
  total: number;
  label: string;
}

const CATEGORY_LABELS: Record<CheckCategory, string> = {
  rules: 'AI Rules',
  skills: 'Skills',
  hooks: 'Hooks & Safety',
  ci: 'CI/CD',
  security: 'Security',
  quality: 'Code Quality',
  policies: 'Policies',
};

function fileExists(dir: string, ...paths: string[]): boolean {
  return existsSync(join(dir, ...paths));
}

function fileContains(
  dir: string,
  path: string,
  text: string,
): boolean {
  const full = join(dir, path);
  if (!existsSync(full)) return false;
  try {
    return readFileSync(full, 'utf-8').includes(text);
  } catch {
    return false;
  }
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

function checkRules(dir: string): CheckResult[] {
  const results: CheckResult[] = [];

  const hasClaudeMd = fileExists(dir, 'CLAUDE.md');
  results.push({
    name: 'CLAUDE.md',
    status: hasClaudeMd ? 'pass' : 'fail',
    detail: hasClaudeMd
      ? 'AI rules file found'
      : 'No CLAUDE.md — AI tools have no project rules',
    category: 'rules',
    weight: 3,
  });

  if (hasClaudeMd) {
    const hasGovernance = fileContains(
      dir,
      'CLAUDE.md',
      'AI Code Governance',
    );
    results.push({
      name: 'AI governance rules',
      status: hasGovernance ? 'pass' : 'warn',
      detail: hasGovernance
        ? 'AI governance section found'
        : 'CLAUDE.md lacks AI governance rules — run forge-ai-init --force to update',
      category: 'rules',
      weight: 2,
    });

    const hasAntiPatterns = fileContains(
      dir,
      'CLAUDE.md',
      'Anti-Patterns',
    );
    results.push({
      name: 'Anti-pattern rules',
      status: hasAntiPatterns ? 'pass' : 'warn',
      detail: hasAntiPatterns
        ? 'Anti-pattern detection rules found'
        : 'No anti-pattern rules — AI may generate copy-paste code',
      category: 'rules',
      weight: 2,
    });
  }

  const hasCursor = fileExists(dir, '.cursorrules');
  const hasWindsurf = fileExists(dir, '.windsurfrules');
  const hasCopilot = fileExists(
    dir,
    '.github',
    'copilot-instructions.md',
  );
  const toolCount = [hasCursor, hasWindsurf, hasCopilot].filter(
    Boolean,
  ).length;

  results.push({
    name: 'Multi-tool rules',
    status: toolCount >= 2 ? 'pass' : toolCount === 1 ? 'warn' : hasClaudeMd ? 'warn' : 'fail',
    detail:
      toolCount >= 2
        ? `${toolCount + (hasClaudeMd ? 1 : 0)} AI tool rule files found`
        : hasClaudeMd
          ? 'Only CLAUDE.md — consider adding rules for other AI tools'
          : 'No AI tool rule files found',
    category: 'rules',
    weight: 1,
  });

  return results;
}

function checkSkills(dir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const skillsDir = join(dir, '.claude', 'skills');
  const hasSkills = dirHasFiles(dir, '.claude', 'skills');

  results.push({
    name: 'AI skills',
    status: hasSkills ? 'pass' : 'fail',
    detail: hasSkills
      ? 'Skills directory found'
      : 'No .claude/skills/ — AI tools lack specialized workflows',
    category: 'skills',
    weight: 2,
  });

  if (hasSkills) {
    const skillNames = [
      'quality-gate',
      'security-check',
      'code-conscience',
      'arch-review',
      'test-first',
      'migration-audit',
      'tech-debt-review',
      'dependency-audit',
      'scalability-review',
    ];

    let count = 0;
    for (const name of skillNames) {
      if (fileExists(skillsDir, name, 'SKILL.md')) count++;
    }

    results.push({
      name: 'Skill coverage',
      status: count >= 5 ? 'pass' : count >= 3 ? 'warn' : 'fail',
      detail: `${count} of ${skillNames.length} governance skills configured`,
      category: 'skills',
      weight: 2,
    });
  }

  return results;
}

function checkHooks(dir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const settingsPath = join(dir, '.claude', 'settings.json');
  const hasSettings = existsSync(settingsPath);

  results.push({
    name: 'Claude settings',
    status: hasSettings ? 'pass' : 'fail',
    detail: hasSettings
      ? 'Settings file found'
      : 'No .claude/settings.json — no safety hooks configured',
    category: 'hooks',
    weight: 2,
  });

  if (hasSettings) {
    try {
      const settings = JSON.parse(
        readFileSync(settingsPath, 'utf-8'),
      );
      const hasPreHooks =
        settings?.hooks?.PreToolUse?.length > 0;
      const hasPostHooks =
        settings?.hooks?.PostToolUse?.length > 0;

      results.push({
        name: 'Pre-tool hooks',
        status: hasPreHooks ? 'pass' : 'warn',
        detail: hasPreHooks
          ? 'Safety hooks active before tool execution'
          : 'No PreToolUse hooks — destructive commands not guarded',
        category: 'hooks',
        weight: 2,
      });

      results.push({
        name: 'Post-tool hooks',
        status: hasPostHooks ? 'pass' : 'warn',
        detail: hasPostHooks
          ? 'Auto-formatting hooks active after edits'
          : 'No PostToolUse hooks — no auto-formatting',
        category: 'hooks',
        weight: 1,
      });
    } catch {
      results.push({
        name: 'Settings parse',
        status: 'warn',
        detail: 'Could not parse settings.json',
        category: 'hooks',
        weight: 1,
      });
    }
  }

  return results;
}

function checkCi(
  dir: string,
  stack: DetectedStack,
): CheckResult[] {
  const results: CheckResult[] = [];

  const hasGhWorkflows = dirHasFiles(
    dir,
    '.github',
    'workflows',
  );
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
        (f) =>
          f.includes('secret') ||
          f.includes('trufflehog') ||
          f.includes('gitleaks'),
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

function checkSecurity(dir: string): CheckResult[] {
  const results: CheckResult[] = [];

  const hasGitignore = fileExists(dir, '.gitignore');
  let envIgnored = false;
  if (hasGitignore) {
    envIgnored = fileContains(dir, '.gitignore', '.env');
  }

  results.push({
    name: '.env protection',
    status: envIgnored ? 'pass' : 'warn',
    detail: envIgnored
      ? '.env files excluded from git'
      : '.env not in .gitignore — secrets may be committed',
    category: 'security',
    weight: 3,
  });

  const hasSecurityMd = fileExists(dir, 'SECURITY.md');
  results.push({
    name: 'Security policy',
    status: hasSecurityMd ? 'pass' : 'warn',
    detail: hasSecurityMd
      ? 'SECURITY.md found'
      : 'No SECURITY.md — no vulnerability disclosure process',
    category: 'security',
    weight: 1,
  });

  const hasMcpConfig = fileExists(dir, '.mcp.json');
  results.push({
    name: 'MCP configuration',
    status: hasMcpConfig ? 'pass' : 'warn',
    detail: hasMcpConfig
      ? 'MCP servers configured for AI tools'
      : 'No .mcp.json — AI tools lack context servers',
    category: 'security',
    weight: 1,
  });

  return results;
}

function checkQuality(
  dir: string,
  stack: DetectedStack,
): CheckResult[] {
  const results: CheckResult[] = [];

  results.push({
    name: 'Linting',
    status: stack.hasLinting ? 'pass' : 'fail',
    detail: stack.hasLinting
      ? `Linter configured${stack.lintCommand ? ` (${stack.lintCommand})` : ''}`
      : 'No linter — code style issues go uncaught',
    category: 'quality',
    weight: 2,
  });

  results.push({
    name: 'Type checking',
    status: stack.hasTypeChecking ? 'pass' : 'fail',
    detail: stack.hasTypeChecking
      ? 'Type checking enabled'
      : 'No type checking — type errors reach production',
    category: 'quality',
    weight: 3,
  });

  results.push({
    name: 'Formatting',
    status: stack.hasFormatting ? 'pass' : 'warn',
    detail: stack.hasFormatting
      ? 'Code formatter configured'
      : 'No formatter — inconsistent code style across contributors',
    category: 'quality',
    weight: 1,
  });

  const hasTests = !!stack.testFramework;
  results.push({
    name: 'Test framework',
    status: hasTests ? 'pass' : 'fail',
    detail: hasTests
      ? `Test framework detected (${stack.testFramework})`
      : 'No test framework — code ships without automated tests',
    category: 'quality',
    weight: 3,
  });

  return results;
}

function checkPolicies(dir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const hasPolicies = dirHasFiles(dir, '.forge', 'policies');

  results.push({
    name: 'Policy engine',
    status: hasPolicies ? 'pass' : 'warn',
    detail: hasPolicies
      ? 'Enterprise policies configured'
      : 'No .forge/policies/ — no automated policy enforcement',
    category: 'policies',
    weight: 1,
  });

  if (hasPolicies) {
    const policyDir = join(dir, '.forge', 'policies');
    try {
      const files = readdirSync(policyDir);
      const policyTypes = ['security', 'quality', 'compliance'];
      const found = policyTypes.filter((t) =>
        files.some((f) => f.includes(t)),
      );
      results.push({
        name: 'Policy coverage',
        status:
          found.length >= 3
            ? 'pass'
            : found.length >= 1
              ? 'warn'
              : 'fail',
        detail: `${found.length} of ${policyTypes.length} core policies (${found.join(', ') || 'none'})`,
        category: 'policies',
        weight: 1,
      });
    } catch {
      // ignore
    }
  }

  const hasScorecard = fileExists(dir, '.forge', 'scorecard.json');
  results.push({
    name: 'Scorecard',
    status: hasScorecard ? 'pass' : 'warn',
    detail: hasScorecard
      ? 'Scorecard configuration found'
      : 'No scorecard — no automated project scoring',
    category: 'policies',
    weight: 1,
  });

  return results;
}

function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function runAudit(
  dir: string,
  stack: DetectedStack,
): AuditReport {
  const checks = [
    ...checkRules(dir),
    ...checkSkills(dir),
    ...checkHooks(dir),
    ...checkCi(dir, stack),
    ...checkSecurity(dir),
    ...checkQuality(dir, stack),
    ...checkPolicies(dir),
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks.reduce(
    (s, c) =>
      s +
      (c.status === 'pass'
        ? c.weight
        : c.status === 'warn'
          ? c.weight * 0.5
          : 0),
    0,
  );

  const score = Math.round((earnedWeight / totalWeight) * 100);
  const grade = scoreToGrade(score);

  const categories = [
    ...new Set(checks.map((c) => c.category)),
  ] as CheckCategory[];
  const summary = categories.map((cat) => {
    const catChecks = checks.filter((c) => c.category === cat);
    return {
      category: cat,
      passed: catChecks.filter((c) => c.status === 'pass')
        .length,
      total: catChecks.length,
      label: CATEGORY_LABELS[cat],
    };
  });

  return { checks, score, grade, summary };
}
