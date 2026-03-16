import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';

const mockRunGate = jest.fn();

jest.unstable_mockModule('../../src/gate.js', () => ({
  runGate: mockRunGate,
}));

type GateResult = {
  passed: boolean;
  score: number;
  grade: string;
  threshold: number;
  phase: string;
  violations: Array<{ rule: string; severity: string; count: number; blocked: boolean }>;
  summary: string;
};

let runGateCommand: (
  projectDir: string,
  phase?: string,
  threshold?: number,
  asJson?: boolean,
  format?: string,
) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/gate.js');
  runGateCommand = mod.runGateCommand;
});

function makeGateResult(overrides: Partial<GateResult> = {}): GateResult {
  return {
    passed: true,
    score: 85,
    grade: 'A',
    threshold: 80,
    phase: 'production',
    violations: [],
    summary: 'All checks passed.',
    ...overrides,
  };
}

describe('runGateCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockRunGate.mockReset();
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
    process.exitCode = undefined;
  });

  it('runs without throwing for passed gate', () => {
    mockRunGate.mockReturnValue(makeGateResult({ passed: true }));
    expect(() => runGateCommand('/tmp/proj')).not.toThrow();
  });

  it('runs without throwing for failed gate', () => {
    mockRunGate.mockReturnValue(makeGateResult({ passed: false, score: 50 }));
    expect(() => runGateCommand('/tmp/proj')).not.toThrow();
  });

  it('sets exitCode to 0 when passed', () => {
    mockRunGate.mockReturnValue(makeGateResult({ passed: true }));
    runGateCommand('/tmp/proj');
    expect(process.exitCode).toBe(0);
  });

  it('sets exitCode to 1 when failed', () => {
    mockRunGate.mockReturnValue(makeGateResult({ passed: false }));
    runGateCommand('/tmp/proj');
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON when asJson is true', () => {
    mockRunGate.mockReturnValue(makeGateResult());
    runGateCommand('/tmp/proj', undefined, undefined, true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"passed"');
  });

  it('outputs JSON when format=json', () => {
    mockRunGate.mockReturnValue(makeGateResult());
    runGateCommand('/tmp/proj', undefined, undefined, false, 'json');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"passed"');
  });

  it('outputs markdown when format=markdown', () => {
    mockRunGate.mockReturnValue(makeGateResult());
    runGateCommand('/tmp/proj', undefined, undefined, false, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('forge-ai-init Quality Gate');
  });

  it('shows violations in default output', () => {
    mockRunGate.mockReturnValue(makeGateResult({
      passed: false,
      violations: [{ rule: 'no-console', severity: 'high', count: 3, blocked: true }],
    }));
    runGateCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('no-console');
  });

  it('shows violations in markdown output', () => {
    mockRunGate.mockReturnValue(makeGateResult({
      passed: false,
      violations: [{ rule: 'no-hardcoded-secrets', severity: 'critical', count: 1, blocked: true }],
    }));
    runGateCommand('/tmp/proj', undefined, undefined, false, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('no-hardcoded-secrets');
  });

  it('calls runGate with projectDir and phase', () => {
    mockRunGate.mockReturnValue(makeGateResult());
    runGateCommand('/my/project', 'production', 80);
    expect(mockRunGate).toHaveBeenCalledWith('/my/project', 'production', 80);
  });

  it('passes FAILED label in default output when gate fails', () => {
    mockRunGate.mockReturnValue(makeGateResult({ passed: false }));
    runGateCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('FAILED');
  });

  it('passes PASSED label in default output when gate passes', () => {
    mockRunGate.mockReturnValue(makeGateResult({ passed: true }));
    runGateCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('PASSED');
  });
});
