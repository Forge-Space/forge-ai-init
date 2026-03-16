import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';
import type { MigrationPlan } from '../../src/migrate-analyzer.js';

const mockAnalyzeMigration = jest.fn();

jest.unstable_mockModule('../../src/migrate-analyzer.js', () => ({
  analyzeMigration: mockAnalyzeMigration,
}));

let runMigratePlanCommand: (projectDir: string, stack: DetectedStack, asJson: boolean) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/migrate-plan.js');
  runMigratePlanCommand = mod.runMigratePlanCommand;
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

function makeMigrationPlan(overrides: Partial<MigrationPlan> = {}): MigrationPlan {
  return {
    strategy: {
      name: 'Strangler Fig',
      description: 'Incrementally replace legacy components',
      applicableTo: 'Monolithic applications',
    },
    boundaries: [],
    typingPlan: [],
    dependencyRisks: [],
    phases: [
      {
        name: 'Phase 1: Setup',
        description: 'Add governance layer',
        tasks: ['Run forge-ai-init', 'Add CI'],
        gate: 'Score >= 40',
      },
    ],
    estimatedEffort: '2-4 weeks',
    ...overrides,
  };
}

describe('runMigratePlanCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    mockAnalyzeMigration.mockReset();
    mockAnalyzeMigration.mockReturnValue(makeMigrationPlan());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing', () => {
    expect(() => runMigratePlanCommand('/tmp/proj', makeStack(), false)).not.toThrow();
  });

  it('outputs JSON when asJson is true', () => {
    runMigratePlanCommand('/tmp/proj', makeStack(), true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"strategy"');
  });

  it('calls analyzeMigration with projectDir and stack', () => {
    runMigratePlanCommand('/my/project', makeStack(), false);
    expect(mockAnalyzeMigration).toHaveBeenCalledWith('/my/project', expect.any(Object));
  });

  it('shows strategy name in output', () => {
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Strangler Fig');
  });

  it('shows phases in output', () => {
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Phase 1: Setup');
  });

  it('shows estimated effort in output', () => {
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('2-4 weeks');
  });

  it('shows boundaries when present', () => {
    mockAnalyzeMigration.mockReturnValue(makeMigrationPlan({
      boundaries: [{ module: 'auth', type: 'service', complexity: 'high', reason: 'Complex auth', dependents: 3 }],
    }));
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('auth');
  });

  it('shows dependency risks when present', () => {
    mockAnalyzeMigration.mockReturnValue(makeMigrationPlan({
      dependencyRisks: [{
        name: 'lodash',
        currentVersion: '3.x',
        issue: 'Outdated',
        severity: 'high',
        recommendation: 'Upgrade to 4.x',
      }],
    }));
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('lodash');
  });

  it('shows typing plan when present', () => {
    mockAnalyzeMigration.mockReturnValue(makeMigrationPlan({
      typingPlan: [{ file: 'src/utils.js', priority: 'high', reason: 'Many usages', estimatedLines: 150 }],
    }));
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('src/utils.js');
  });

  it('shows typing plan truncation when more than 10 items', () => {
    const typingPlan = Array.from({ length: 12 }, (_, i) => ({
      file: `src/file${i}.js`,
      priority: 'medium' as const,
      reason: 'Needs types',
      estimatedLines: 100,
    }));
    mockAnalyzeMigration.mockReturnValue(makeMigrationPlan({ typingPlan }));
    runMigratePlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('more files');
  });
});
