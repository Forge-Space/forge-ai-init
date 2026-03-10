import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runAudit } from '../src/checker.js';
import type { DetectedStack } from '../src/types.js';

function makeStack(
  overrides: Partial<DetectedStack> = {},
): DetectedStack {
  return {
    language: 'typescript',
    packageManager: 'npm',
    monorepo: false,
    hasLinting: true,
    hasTypeChecking: true,
    hasFormatting: true,
    hasCi: true,
    ciProvider: 'github-actions',
    buildCommand: 'npm run build',
    testCommand: 'npm run test',
    lintCommand: 'npm run lint',
    testFramework: 'jest',
    ...overrides,
  };
}

function createProject(
  files: Record<string, string>,
): string {
  const dir = join(
    tmpdir(),
    `forge-check-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(full.substring(0, full.lastIndexOf('/')), {
      recursive: true,
    });
    writeFileSync(full, content);
  }
  return dir;
}

describe('checker', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('scores empty project with F grade', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const report = runAudit(
      tempDir,
      makeStack({
        hasLinting: false,
        hasTypeChecking: false,
        hasFormatting: false,
        hasCi: false,
        testFramework: undefined,
      }),
    );

    expect(report.grade).toBe('F');
    expect(report.score).toBeLessThan(40);

    const failures = report.checks.filter(
      (c) => c.status === 'fail',
    );
    expect(failures.length).toBeGreaterThan(5);
  });

  it('scores fully governed project with A grade', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
      'CLAUDE.md':
        '# Project Rules\n## AI Code Governance\n## AI Anti-Patterns to Block\n',
      '.cursorrules': 'rules',
      '.windsurfrules': 'rules',
      '.github/copilot-instructions.md': '# Copilot',
      '.claude/settings.json': JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash(git commit)',
              hooks: [
                {
                  command:
                    'npx forge-ai-init test-autogen --staged --write --check',
                },
              ],
            },
          ],
          PostToolUse: [{ matcher: 'test', hooks: [] }],
        },
      }),
      '.claude/skills/quality-gate/SKILL.md': 'skill',
      '.claude/skills/security-check/SKILL.md': 'skill',
      '.claude/skills/code-conscience/SKILL.md': 'skill',
      '.claude/skills/test-autogen/SKILL.md': 'skill',
      '.claude/skills/arch-review/SKILL.md': 'skill',
      '.claude/skills/test-first/SKILL.md': 'skill',
      '.mcp.json': '{}',
      '.gitignore': '.env\nnode_modules',
      'SECURITY.md': '# Security',
      '.github/workflows/ci.yml': 'ci',
      '.github/workflows/secret-scan.yml': 'secret',
      '.github/workflows/security.yml': 'security',
      '.forge/policies/security.policy.json':
        '{"rules":[]}',
      '.forge/policies/quality.policy.json':
        '{"rules":[]}',
      '.forge/policies/compliance.policy.json':
        '{"rules":[]}',
      '.forge/scorecard.json': '{}',
    });

    const report = runAudit(tempDir, makeStack());

    expect(report.grade).toBe('A');
    expect(report.score).toBeGreaterThanOrEqual(90);

    const failures = report.checks.filter(
      (c) => c.status === 'fail',
    );
    expect(failures.length).toBe(0);
  });

  it('detects missing CLAUDE.md as critical', () => {
    tempDir = createProject({
      'package.json': '{}',
    });

    const report = runAudit(tempDir, makeStack());

    const claudeCheck = report.checks.find(
      (c) => c.name === 'CLAUDE.md',
    );
    expect(claudeCheck?.status).toBe('fail');
    expect(claudeCheck?.weight).toBe(3);
  });

  it('detects CLAUDE.md without governance rules', () => {
    tempDir = createProject({
      'CLAUDE.md': '# My rules\nSome basic rules',
    });

    const report = runAudit(tempDir, makeStack());

    const govCheck = report.checks.find(
      (c) => c.name === 'AI governance rules',
    );
    expect(govCheck?.status).toBe('warn');
  });

  it('detects missing CI as critical', () => {
    tempDir = createProject({
      'package.json': '{}',
    });

    const report = runAudit(
      tempDir,
      makeStack({ hasCi: false }),
    );

    const ciCheck = report.checks.find(
      (c) => c.name === 'CI/CD pipeline',
    );
    expect(ciCheck?.status).toBe('fail');
    expect(ciCheck?.weight).toBe(3);
  });

  it('detects missing linting and type checking', () => {
    tempDir = createProject({
      'package.json': '{}',
    });

    const report = runAudit(
      tempDir,
      makeStack({
        hasLinting: false,
        hasTypeChecking: false,
      }),
    );

    const lintCheck = report.checks.find(
      (c) => c.name === 'Linting',
    );
    const typeCheck = report.checks.find(
      (c) => c.name === 'Type checking',
    );
    expect(lintCheck?.status).toBe('fail');
    expect(typeCheck?.status).toBe('fail');
  });

  it('warns when .env not in .gitignore', () => {
    tempDir = createProject({
      '.gitignore': 'node_modules\n',
    });

    const report = runAudit(tempDir, makeStack());

    const envCheck = report.checks.find(
      (c) => c.name === '.env protection',
    );
    expect(envCheck?.status).toBe('warn');
  });

  it('passes when .env is in .gitignore', () => {
    tempDir = createProject({
      '.gitignore': '.env\nnode_modules\n',
    });

    const report = runAudit(tempDir, makeStack());

    const envCheck = report.checks.find(
      (c) => c.name === '.env protection',
    );
    expect(envCheck?.status).toBe('pass');
  });

  it('counts skills correctly', () => {
    tempDir = createProject({
      '.claude/skills/quality-gate/SKILL.md': 'skill',
      '.claude/skills/security-check/SKILL.md': 'skill',
      '.claude/skills/code-conscience/SKILL.md': 'skill',
      '.claude/skills/test-autogen/SKILL.md': 'skill',
      '.claude/skills/arch-review/SKILL.md': 'skill',
      '.claude/skills/test-first/SKILL.md': 'skill',
    });

    const report = runAudit(tempDir, makeStack());

    const skillCoverage = report.checks.find(
      (c) => c.name === 'Skill coverage',
    );
    expect(skillCoverage?.status).toBe('pass');
    expect(skillCoverage?.detail).toContain('6 of 10');
  });

  it('provides category summaries', () => {
    tempDir = createProject({
      'CLAUDE.md': '# Rules\n## AI Code Governance\n## Anti-Patterns\n',
      '.cursorrules': 'rules',
      '.windsurfrules': 'rules',
    });

    const report = runAudit(tempDir, makeStack());

    expect(report.summary.length).toBeGreaterThan(0);
    const rulesSummary = report.summary.find(
      (s) => s.category === 'rules',
    );
    expect(rulesSummary).toBeDefined();
    expect(rulesSummary!.label).toBe('AI Rules');
    expect(rulesSummary!.total).toBeGreaterThan(0);
  });

  it('calculates weighted scores correctly', () => {
    tempDir = createProject({
      'package.json': '{}',
    });

    const report = runAudit(tempDir, makeStack());
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('grade boundaries are correct', () => {
    tempDir = createProject({
      'package.json': '{}',
    });

    const report = runAudit(tempDir, makeStack());
    const { score, grade } = report;

    if (score >= 90) expect(grade).toBe('A');
    else if (score >= 75) expect(grade).toBe('B');
    else if (score >= 60) expect(grade).toBe('C');
    else if (score >= 40) expect(grade).toBe('D');
    else expect(grade).toBe('F');
  });

  it('detects enterprise policies', () => {
    tempDir = createProject({
      '.forge/policies/security.policy.json': '{"rules":[]}',
      '.forge/policies/quality.policy.json': '{"rules":[]}',
      '.forge/policies/compliance.policy.json': '{"rules":[]}',
      '.forge/scorecard.json': '{}',
    });

    const report = runAudit(tempDir, makeStack());

    const policyCheck = report.checks.find(
      (c) => c.name === 'Policy engine',
    );
    expect(policyCheck?.status).toBe('pass');

    const coverage = report.checks.find(
      (c) => c.name === 'Policy coverage',
    );
    expect(coverage?.status).toBe('pass');
    expect(coverage?.detail).toContain('3 of 3');

    const scorecard = report.checks.find(
      (c) => c.name === 'Scorecard',
    );
    expect(scorecard?.status).toBe('pass');
  });

  it('detects GitHub Actions workflows', () => {
    tempDir = createProject({
      '.github/workflows/ci.yml': 'name: CI',
      '.github/workflows/secret-scan.yml': 'name: Secrets',
      '.github/workflows/semgrep.yml': 'name: Security',
    });

    const report = runAudit(tempDir, makeStack());

    const ciCheck = report.checks.find(
      (c) => c.name === 'CI/CD pipeline',
    );
    expect(ciCheck?.status).toBe('pass');

    const secretCheck = report.checks.find(
      (c) => c.name === 'Secret scanning',
    );
    expect(secretCheck?.status).toBe('pass');

    const securityCheck = report.checks.find(
      (c) => c.name === 'Security scanning',
    );
    expect(securityCheck?.status).toBe('pass');
  });
});
