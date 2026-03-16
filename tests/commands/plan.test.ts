import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';
import type { ArchPlan } from '../../src/planner.js';

const mockGeneratePlan = jest.fn();

jest.unstable_mockModule('../../src/planner.js', () => ({
  generatePlan: mockGeneratePlan,
}));

let runPlanCommand: (projectDir: string, stack: DetectedStack, asJson: boolean) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/plan.js');
  runPlanCommand = mod.runPlanCommand;
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

function makeArchPlan(overrides: Partial<ArchPlan> = {}): ArchPlan {
  const stack = makeStack();
  return {
    stack,
    scan: {
      grade: 'B',
      score: 75,
      filesScanned: 20,
      findings: [],
      summary: [],
      topFiles: [],
    },
    structure: {
      totalFiles: 30,
      sourceFiles: 25,
      testFiles: 5,
      configFiles: 5,
      topDirs: ['src', 'tests'],
      entryPoints: ['src/index.ts'],
      testRatio: 20,
    },
    risks: [],
    recommendations: [],
    adrs: [],
    scalingStrategy: 'Horizontal scaling with load balancer',
    qualityGates: [],
    ...overrides,
  };
}

describe('runPlanCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    mockGeneratePlan.mockReset();
    mockGeneratePlan.mockReturnValue(makeArchPlan());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing', () => {
    expect(() => runPlanCommand('/tmp/proj', makeStack(), false)).not.toThrow();
  });

  it('outputs JSON when asJson is true', () => {
    runPlanCommand('/tmp/proj', makeStack(), true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"scalingStrategy"');
  });

  it('calls generatePlan with projectDir and stack', () => {
    runPlanCommand('/my/project', makeStack(), false);
    expect(mockGeneratePlan).toHaveBeenCalledWith('/my/project', expect.any(Object));
  });

  it('shows score in default output', () => {
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('75');
  });

  it('shows scaling strategy in output', () => {
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Horizontal scaling');
  });

  it('shows risks in output', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      risks: [{ area: 'Testing', severity: 'high', description: 'Low test coverage', mitigation: 'Add tests' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Testing');
    expect(calls).toContain('Add tests');
  });

  it('shows recommendations in output', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      recommendations: [{ category: 'CI', title: 'Add CI pipeline', description: 'Set up GitHub Actions', priority: 'must' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Add CI pipeline');
  });

  it('shows ADRs in output', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      adrs: [{ title: 'Use TypeScript', context: 'Type safety needed', decision: 'Adopt TypeScript' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Use TypeScript');
  });

  it('shows quality gates in output', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      qualityGates: [{ phase: 'production', threshold: 80, checks: ['lint', 'test'] }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('production');
  });

  it('shows entry points in output', () => {
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('src/index.ts');
  });

  it('shows critical risk severity', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      risks: [{ area: 'Security', severity: 'critical', description: 'Exposed secrets', mitigation: 'Use env vars' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Security');
  });

  it('shows medium risk severity', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      risks: [{ area: 'Docs', severity: 'medium', description: 'Missing docs', mitigation: 'Add docs' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Docs');
  });

  it('shows low risk severity', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      risks: [{ area: 'Style', severity: 'low', description: 'Inconsistent style', mitigation: 'Add linter' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Style');
  });

  it('shows should priority recommendation', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      recommendations: [{ category: 'Quality', title: 'Add tests', description: 'Improve coverage', priority: 'should' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Add tests');
  });

  it('shows could priority recommendation', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      recommendations: [{ category: 'Docs', title: 'Add README', description: 'Document the project', priority: 'could' }],
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Add README');
  });

  it('shows no entry points when none detected', () => {
    mockGeneratePlan.mockReturnValue(makeArchPlan({
      structure: {
        totalFiles: 10,
        sourceFiles: 8,
        testFiles: 2,
        configFiles: 1,
        topDirs: ['src'],
        entryPoints: [],
        testRatio: 20,
      },
    }));
    runPlanCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('none detected');
  });
});
