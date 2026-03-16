import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';
import type { TestAutogenResult } from '../../src/test-autogen.js';

const mockRunTestAutogen = jest.fn();
const mockSummarizeTestAutogen = jest.fn();

jest.unstable_mockModule('../../src/test-autogen.js', () => ({
  runTestAutogen: mockRunTestAutogen,
  summarizeTestAutogen: mockSummarizeTestAutogen,
}));

let runTestAutogenCommand: (
  projectDir: string,
  stack: DetectedStack,
  opts: Record<string, unknown>,
) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/test-autogen.js');
  runTestAutogenCommand = mod.runTestAutogenCommand;
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

function makeTestAutogenResult(overrides: Partial<TestAutogenResult> = {}): TestAutogenResult {
  return {
    passed: true,
    stack: 'node',
    changedFiles: [],
    requirements: [],
    created: [],
    existing: [],
    missing: [],
    bypassed: false,
    telemetryPath: '.forge/test-autogen-telemetry.json',
    ...overrides,
  };
}

describe('runTestAutogenCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockRunTestAutogen.mockReset();
    mockSummarizeTestAutogen.mockReset();
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult());
    mockSummarizeTestAutogen.mockReturnValue('All tests up to date.');
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
    process.exitCode = undefined;
  });

  it('runs without throwing', () => {
    expect(() => runTestAutogenCommand('/tmp/proj', makeStack(), {})).not.toThrow();
  });

  it('outputs JSON when json opt is set', () => {
    runTestAutogenCommand('/tmp/proj', makeStack(), { json: true });
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"passed"');
  });

  it('sets exitCode to 0 when passed', () => {
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult({ passed: true }));
    runTestAutogenCommand('/tmp/proj', makeStack(), {});
    expect(process.exitCode).toBe(0);
  });

  it('sets exitCode to 1 when not passed', () => {
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult({ passed: false }));
    runTestAutogenCommand('/tmp/proj', makeStack(), { json: true });
    expect(process.exitCode).toBe(1);
  });

  it('shows created tests in output', () => {
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult({
      created: ['tests/foo.test.ts'],
    }));
    runTestAutogenCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('tests/foo.test.ts');
  });

  it('shows missing tests in output', () => {
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult({
      passed: false,
      missing: ['tests/bar.test.ts'],
    }));
    runTestAutogenCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('tests/bar.test.ts');
  });

  it('shows bypassed message when bypassed', () => {
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult({
      bypassed: true,
      bypassExpiresAt: '2024-12-31',
      bypassReason: 'Legacy codebase',
    }));
    runTestAutogenCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Bypassed');
    expect(calls).toContain('Legacy codebase');
  });

  it('calls runTestAutogen with write=true when write opt set', () => {
    runTestAutogenCommand('/tmp/proj', makeStack(), { write: true });
    expect(mockRunTestAutogen).toHaveBeenCalledWith(
      '/tmp/proj',
      expect.any(Object),
      expect.objectContaining({ write: true }),
    );
  });

  it('calls runTestAutogen with staged=true when staged opt set', () => {
    runTestAutogenCommand('/tmp/proj', makeStack(), { staged: true });
    expect(mockRunTestAutogen).toHaveBeenCalledWith(
      '/tmp/proj',
      expect.any(Object),
      expect.objectContaining({ staged: true }),
    );
  });

  it('shows summary using summarizeTestAutogen', () => {
    mockSummarizeTestAutogen.mockReturnValue('3 tests missing');
    runTestAutogenCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('3 tests missing');
  });

  it('truncates created list when more than 20', () => {
    const created = Array.from({ length: 22 }, (_, i) => `tests/file${i}.test.ts`);
    mockRunTestAutogen.mockReturnValue(makeTestAutogenResult({ created }));
    runTestAutogenCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('more');
  });
});
