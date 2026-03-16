import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';
import type { HealthReport } from '../../src/doctor.js';

const mockRunDoctor = jest.fn();

jest.unstable_mockModule('../../src/doctor.js', () => ({
  runDoctor: mockRunDoctor,
}));

let runDoctorCommand: (projectDir: string, stack: DetectedStack, asJson: boolean) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/doctor.js');
  runDoctorCommand = mod.runDoctorCommand;
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

function makeHealthReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    score: 85,
    grade: 'A',
    checks: [],
    trend: null,
    couplingScore: 90,
    complexityScore: 80,
    ...overrides,
  };
}

describe('runDoctorCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    mockRunDoctor.mockReset();
    mockRunDoctor.mockReturnValue(makeHealthReport());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing', () => {
    expect(() => runDoctorCommand('/tmp/proj', makeStack(), false)).not.toThrow();
  });

  it('outputs JSON when asJson is true', () => {
    runDoctorCommand('/tmp/proj', makeStack(), true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"score"');
  });

  it('shows score in default output', () => {
    runDoctorCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('85');
  });

  it('calls runDoctor with projectDir and stack', () => {
    runDoctorCommand('/my/project', makeStack(), false);
    expect(mockRunDoctor).toHaveBeenCalledWith('/my/project', expect.any(Object));
  });

  it('shows trend when present', () => {
    mockRunDoctor.mockReturnValue(makeHealthReport({
      trend: { direction: 'improving', scoreDelta: 5, snapshots: 3 },
    }));
    runDoctorCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('improving');
  });

  it('shows degrading trend', () => {
    mockRunDoctor.mockReturnValue(makeHealthReport({
      trend: { direction: 'degrading', scoreDelta: -5, snapshots: 3 },
    }));
    runDoctorCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('degrading');
  });

  it('shows stable trend', () => {
    mockRunDoctor.mockReturnValue(makeHealthReport({
      trend: { direction: 'stable', scoreDelta: 0, snapshots: 2 },
    }));
    runDoctorCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('stable');
  });

  it('shows checks grouped by category', () => {
    mockRunDoctor.mockReturnValue(makeHealthReport({
      checks: [
        { name: 'No god files', status: 'pass', message: 'All good', category: 'architecture' },
        { name: 'Test coverage', status: 'warn', message: 'Below 80%', category: 'testing' },
      ],
    }));
    runDoctorCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('architecture');
    expect(calls).toContain('testing');
  });
});
