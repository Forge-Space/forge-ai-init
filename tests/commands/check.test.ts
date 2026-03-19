import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';
import type { AuditReport } from '../../src/checker.js';

const mockRunAudit = jest.fn();

jest.unstable_mockModule('../../src/checker.js', () => ({
  runAudit: mockRunAudit,
}));

let runCheckCommand: (projectDir: string, stack: DetectedStack) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/check.js');
  runCheckCommand = mod.runCheckCommand;
});

function makeStack(overrides: Partial<DetectedStack> = {}): DetectedStack {
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
    testCommand: 'npm test',
    lintCommand: 'npm run lint',
    ...overrides,
  };
}

function makeAuditReport(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    grade: 'A',
    score: 95,
    summary: [],
    checks: [],
    ...overrides,
  };
}

describe('runCheckCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockRunAudit.mockReset();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing for grade A', () => {
    mockRunAudit.mockReturnValue(makeAuditReport({ grade: 'A', score: 95 }));
    expect(() => runCheckCommand('/tmp/proj', makeStack())).not.toThrow();
  });

  it('runs without throwing for grade B', () => {
    mockRunAudit.mockReturnValue(makeAuditReport({ grade: 'B', score: 75 }));
    expect(() => runCheckCommand('/tmp/proj', makeStack())).not.toThrow();
  });

  it('runs without throwing for grade F with failures and low score', () => {
    mockRunAudit.mockReturnValue(makeAuditReport({
      grade: 'F',
      score: 40,
      checks: [
        { name: 'missing-rules', status: 'fail', detail: 'No CLAUDE.md found', category: 'rules', weight: 10 },
      ],
      summary: [],
    }));
    expect(() => runCheckCommand('/tmp/proj', makeStack())).not.toThrow();
  });

  it('runs without throwing when checks have warnings', () => {
    mockRunAudit.mockReturnValue(makeAuditReport({
      grade: 'B',
      score: 72,
      checks: [
        { name: 'some-check', status: 'warn', detail: 'Consider improving', category: 'quality', weight: 5 },
      ],
      summary: [],
    }));
    expect(() => runCheckCommand('/tmp/proj', makeStack())).not.toThrow();
  });

  it('runs with summary categories', () => {
    mockRunAudit.mockReturnValue(makeAuditReport({
      grade: 'B',
      score: 80,
      summary: [
        { category: 'rules', passed: 2, total: 3, label: 'AI Rules' },
        { category: 'ci', passed: 1, total: 1, label: 'CI/CD' },
      ],
      checks: [
        { name: 'some-rule', status: 'pass', detail: 'Found CLAUDE.md', category: 'rules', weight: 5 },
        { name: 'another', status: 'fail', detail: 'Missing skills', category: 'rules', weight: 5 },
        { name: 'ci-check', status: 'pass', detail: 'CI configured', category: 'ci', weight: 5 },
      ],
    }));
    expect(() => runCheckCommand('/tmp/proj', makeStack())).not.toThrow();
  });

  it('runs with a summary category that has zero passes', () => {
    mockRunAudit.mockReturnValue(makeAuditReport({
      grade: 'C',
      score: 58,
      summary: [
        { category: 'rules', passed: 0, total: 2, label: 'AI Rules' },
      ],
      checks: [
        {
          name: 'missing-rules',
          status: 'fail',
          detail: 'No CLAUDE.md found',
          category: 'rules',
          weight: 10,
        },
        {
          name: 'missing-skills',
          status: 'fail',
          detail: 'No skills found',
          category: 'rules',
          weight: 5,
        },
      ],
    }));
    expect(() => runCheckCommand('/tmp/proj', makeStack())).not.toThrow();
  });

  it('calls runAudit with the project dir and stack', () => {
    mockRunAudit.mockReturnValue(makeAuditReport());
    runCheckCommand('/my/project', makeStack());
    expect(mockRunAudit).toHaveBeenCalledWith('/my/project', expect.any(Object));
  });

  it('logs output to console', () => {
    mockRunAudit.mockReturnValue(makeAuditReport());
    runCheckCommand('/tmp/proj', makeStack());
    expect(consoleSpy).toHaveBeenCalled();
  });
});
