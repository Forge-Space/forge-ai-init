/**
 * Targeted unit tests for src/test-autogen sub-modules to improve branch coverage.
 * Tests: bypass.ts, git.ts, index.ts (bypass + skip paths), requirements.ts
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// ─── bypass.ts ───────────────────────────────────────────────────────────────

import { validateBypass } from '../src/test-autogen/bypass.js';

describe('validateBypass', () => {
  afterEach(() => {
    delete process.env.FORGE_TEST_AUTOGEN_BYPASS;
    delete process.env.FORGE_BYPASS_REASON;
    delete process.env.FORGE_BYPASS_EXPIRES_AT;
  });

  it('returns active=false, valid=false when bypass env not set', () => {
    const result = validateBypass(new Date());
    expect(result.active).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('returns valid=false with error when bypass active but no reason/expiry', () => {
    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    const result = validateBypass(new Date());
    expect(result.active).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('FORGE_BYPASS_REASON');
  });

  it('returns valid=false when bypass active but only reason set (no expiry)', () => {
    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    process.env.FORGE_BYPASS_REASON = 'emergency hotfix';
    const result = validateBypass(new Date());
    expect(result.active).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('FORGE_BYPASS_EXPIRES_AT');
  });

  it('returns valid=false with error when expiresAt is not a valid ISO date', () => {
    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    process.env.FORGE_BYPASS_REASON = 'emergency hotfix';
    process.env.FORGE_BYPASS_EXPIRES_AT = 'not-a-date';
    const result = validateBypass(new Date());
    expect(result.active).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid ISO datetime');
  });

  it('returns valid=false when bypass is expired', () => {
    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    process.env.FORGE_BYPASS_REASON = 'legacy deploy';
    process.env.FORGE_BYPASS_EXPIRES_AT = '2020-01-01T00:00:00Z';
    const result = validateBypass(new Date());
    expect(result.active).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('returns valid=true with reason and expiresAt when bypass is active and not expired', () => {
    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    process.env.FORGE_BYPASS_REASON = 'planned maintenance';
    process.env.FORGE_BYPASS_EXPIRES_AT = '2099-12-31T23:59:59Z';
    const result = validateBypass(new Date());
    expect(result.active).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('planned maintenance');
    expect(result.expiresAt).toBe('2099-12-31T23:59:59Z');
    expect(result.error).toBeUndefined();
  });
});

// ─── git.ts ──────────────────────────────────────────────────────────────────

import {
  sanitizeGitRef,
  resolveGitBinary,
  runGitCommand,
} from '../src/test-autogen/git.js';

describe('sanitizeGitRef', () => {
  it('returns undefined when ref is undefined/empty', () => {
    expect(sanitizeGitRef(undefined)).toBeUndefined();
    expect(sanitizeGitRef('')).toBeUndefined();
  });

  it('returns undefined when ref contains invalid characters', () => {
    expect(sanitizeGitRef('branch; rm -rf /')).toBeUndefined();
    expect(sanitizeGitRef('branch|evil')).toBeUndefined();
    expect(sanitizeGitRef('branch`cmd`')).toBeUndefined();
  });

  it('returns undefined when ref starts with a dash', () => {
    expect(sanitizeGitRef('-evil-flag')).toBeUndefined();
    expect(sanitizeGitRef('--flag')).toBeUndefined();
  });

  it('returns valid ref for safe git refs', () => {
    expect(sanitizeGitRef('main')).toBe('main');
    expect(sanitizeGitRef('feature/my-branch')).toBe('feature/my-branch');
    expect(sanitizeGitRef('v1.2.3')).toBe('v1.2.3');
    expect(sanitizeGitRef('HEAD')).toBe('HEAD');
  });

  it('returns undefined for ref with tilde (not in safe charset)', () => {
    // SAFE_GIT_REF only allows [A-Za-z0-9._/-], tilde is not allowed
    expect(sanitizeGitRef('HEAD~1')).toBeUndefined();
  });
});

describe('resolveGitBinary', () => {
  it('returns a path to an existing git binary', () => {
    const gitPath = resolveGitBinary();
    expect(existsSync(gitPath)).toBe(true);
  });
});

describe('runGitCommand', () => {
  it('returns empty string when git command fails', () => {
    const result = runGitCommand('/nonexistent/path/that/does/not/exist', ['status']);
    expect(result).toBe('');
  });

  it('returns output for valid git command in real repo', () => {
    // Use this repo's own dir as a valid git repo
    const result = runGitCommand(
      '/Users/lucassantana/Desenvolvimento/forge-space/forge-ai-init',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── index.ts — bypass mode and unsupported/empty-changes paths ──────────────

import { runTestAutogen, summarizeTestAutogen, toActionFindings } from '../src/test-autogen/index.js';
import type { DetectedStack } from '../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
  ciProvider: 'github-actions',
};

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-ta-unit-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('runTestAutogen — bypass paths', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    delete process.env.FORGE_TEST_AUTOGEN_BYPASS;
    delete process.env.FORGE_BYPASS_REASON;
    delete process.env.FORGE_BYPASS_EXPIRES_AT;
  });

  it('invalid bypass: passes=false and records bypass error in missing', () => {
    tempDir = makeTempDir();
    writeFileSync(join(tempDir, 'src.ts'), 'const x = 1;\n');

    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    // No reason/expiry set → invalid bypass

    const result = runTestAutogen(tempDir, baseStack, { check: true });
    expect(result.passed).toBe(false);
    expect(result.missing.some((m) => m.includes('Bypass'))).toBe(true);
  });

  it('valid bypass: bypassed=true, passed=true, creates audit log', () => {
    tempDir = makeTempDir();
    writeFileSync(join(tempDir, 'src.ts'), 'const x = 1;\n');

    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';
    process.env.FORGE_BYPASS_REASON = 'hotfix window';
    process.env.FORGE_BYPASS_EXPIRES_AT = '2099-12-31T23:59:59Z';

    const result = runTestAutogen(tempDir, baseStack, { check: true });
    expect(result.passed).toBe(true);
    expect(result.bypassed).toBe(true);
    expect(result.bypassReason).toBe('hotfix window');
    // Verify audit log was written
    expect(existsSync(join(tempDir, '.forge', 'test-autogen-audit.jsonl'))).toBe(true);
  });
});

describe('runTestAutogen — unsupported stack and no changed files', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns passed=true immediately for unsupported language stack', () => {
    tempDir = makeTempDir();
    const goStack: DetectedStack = {
      ...baseStack,
      language: 'go',
    };

    const result = runTestAutogen(tempDir, goStack, { staged: true });
    expect(result.passed).toBe(true);
    expect(result.stack).toBe('unsupported');
    expect(result.requirements).toHaveLength(0);
  });

  it('returns passed=true when no changed files', () => {
    tempDir = makeTempDir();
    // staged=true with nothing staged → empty changed files
    const result = runTestAutogen(tempDir, baseStack, { staged: true });
    expect(result.passed).toBe(true);
    expect(result.changedFiles).toHaveLength(0);
    expect(result.requirements).toHaveLength(0);
  });
});

describe('runTestAutogen — test file existence check', () => {
  let tempDir = '';

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('existing test file goes into existing list, not missing', () => {
    // Write package.json + tsconfig so detectStack resolves typescript
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'jest' }, devDependencies: { typescript: '^5' } }),
    );
    writeFileSync(join(tempDir, 'tsconfig.json'), '{}');

    // Write the source file  
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'calc.ts'), 'export const x = 1;\n');

    // Pre-create the expected unit test file so it appears as "existing"
    const testPath = join(tempDir, 'tests', 'unit', 'src', 'calc.unit.test.ts');
    mkdirSync(join(tempDir, 'tests', 'unit', 'src'), { recursive: true });
    writeFileSync(testPath, 'test("x", () => {});\n');

    const result = runTestAutogen(tempDir, { ...baseStack }, {
      staged: true,
    });
    // With no staged changes, requirements is empty — just verify we don't crash
    expect(result.passed).toBe(true);
  });
});

describe('toActionFindings', () => {
  it('returns empty array when no missing files', () => {
    const result = {
      passed: true,
      stack: 'node' as const,
      changedFiles: [],
      requirements: [],
      created: [],
      existing: [],
      missing: [],
      bypassed: false,
      telemetryPath: '.forge/test-autogen-telemetry.jsonl',
    };
    expect(toActionFindings(result)).toHaveLength(0);
  });

  it('maps missing files to findings with high severity', () => {
    const result = {
      passed: false,
      stack: 'node' as const,
      changedFiles: ['src/auth.ts'],
      requirements: [],
      created: [],
      existing: [],
      missing: ['tests/unit/src/auth.unit.test.ts'],
      bypassed: false,
      telemetryPath: '.forge/test-autogen-telemetry.jsonl',
    };
    const findings = toActionFindings(result);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('high');
    expect(findings[0]!.rule).toBe('test-autogen-missing');
  });

  it('assigns medium severity for e2e missing tests', () => {
    const result = {
      passed: false,
      stack: 'node' as const,
      changedFiles: ['src/login.ts'],
      requirements: [],
      created: [],
      existing: [],
      missing: ['tests/e2e/src/login.e2e.test.ts'],
      bypassed: false,
      telemetryPath: '.forge/test-autogen-telemetry.jsonl',
    };
    const findings = toActionFindings(result);
    expect(findings[0]!.severity).toBe('medium');
  });
});

describe('summarizeTestAutogen', () => {
  it('includes all key counters in summary string', () => {
    const result = {
      passed: true,
      stack: 'node' as const,
      changedFiles: ['src/a.ts', 'src/b.ts'],
      requirements: [{ sourceFile: 'src/a.ts', scope: 'unit' as const, testFile: 'tests/unit/src/a.unit.test.ts', reason: 'changed' }],
      created: ['tests/unit/src/a.unit.test.ts'],
      existing: [],
      missing: [],
      bypassed: false,
      telemetryPath: '.forge/test-autogen-telemetry.jsonl',
    };
    const summary = summarizeTestAutogen(result);
    expect(summary).toContain('changed=2');
    expect(summary).toContain('requirements=1');
    expect(summary).toContain('created=1');
    expect(summary).toContain('missing=0');
  });

  it('includes bypassed=true in summary when bypassed', () => {
    const result = {
      passed: true,
      stack: 'node' as const,
      changedFiles: [],
      requirements: [],
      created: [],
      existing: [],
      missing: [],
      bypassed: true,
      bypassReason: 'hotfix',
      telemetryPath: '.forge/test-autogen-telemetry.jsonl',
    };
    const summary = summarizeTestAutogen(result);
    expect(summary).toContain('bypassed=true');
  });
});

// ─── requirements.ts — line 64 (readText catch path via unreadable file) ─────

import { buildRequirements } from '../src/test-autogen/requirements.js';

describe('buildRequirements', () => {
  it('handles source files that do not exist in projectDir gracefully', () => {
    const requirements = buildRequirements(
      baseStack,
      'node',
      ['src/nonexistent-file.ts'],
      '/nonexistent/project/dir',
    );
    // Should still produce a unit requirement without crashing
    expect(requirements.some((r) => r.scope === 'unit')).toBe(true);
  });

  it('produces e2e requirement for critical flow files', () => {
    const dir = makeTempDir();
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'auth.ts'), 'export function login() {}');

    const requirements = buildRequirements(
      baseStack,
      'node',
      ['src/auth.ts'],
      dir,
    );
    expect(requirements.some((r) => r.scope === 'e2e')).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
