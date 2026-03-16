import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';

const mockAnalyzeDiff = jest.fn();

jest.unstable_mockModule('../../src/diff-analyzer.js', () => ({
  analyzeDiff: mockAnalyzeDiff,
}));

type DiffFinding = { file: string; rule: string; severity: string; message: string };

type DiffResult = {
  changedFiles: string[];
  beforeScore: number;
  afterScore: number;
  delta: number;
  improved: boolean;
  newFindings: DiffFinding[];
  resolvedFindings: DiffFinding[];
  summary: string;
};

let runDiffCommand: (
  projectDir: string,
  base?: string,
  staged?: boolean,
  asJson?: boolean,
) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/diff.js');
  runDiffCommand = mod.runDiffCommand;
});

function makeDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    changedFiles: [],
    beforeScore: 80,
    afterScore: 80,
    delta: 0,
    improved: false,
    newFindings: [],
    resolvedFindings: [],
    summary: 'No changes.',
    ...overrides,
  };
}

describe('runDiffCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    mockAnalyzeDiff.mockReset();
    mockAnalyzeDiff.mockReturnValue(makeDiffResult());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing for no changed files', () => {
    expect(() => runDiffCommand('/tmp/proj')).not.toThrow();
  });

  it('outputs JSON when asJson is true', () => {
    runDiffCommand('/tmp/proj', undefined, false, true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"changedFiles"');
  });

  it('shows no changed files message when empty', () => {
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('No changed files');
  });

  it('shows changed files count when present', () => {
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/foo.ts', 'src/bar.ts'],
      delta: 2,
      improved: true,
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('2');
  });

  it('shows new findings in output', () => {
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/foo.ts'],
      newFindings: [{ file: 'src/foo.ts', rule: 'no-console', severity: 'high', message: 'Avoid log' }],
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('src/foo.ts');
  });

  it('calls analyzeDiff with base branch', () => {
    runDiffCommand('/my/project', 'develop');
    expect(mockAnalyzeDiff).toHaveBeenCalledWith('/my/project', expect.objectContaining({ base: 'develop' }));
  });

  it('shows summary in output', () => {
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/x.ts'],
      summary: 'Score improved by 2.',
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Score improved');
  });

  it('shows score delta when files changed', () => {
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/a.ts'],
      beforeScore: 75,
      afterScore: 80,
      delta: 5,
      improved: true,
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('75');
    expect(calls).toContain('80');
  });

  it('shows truncation when more than 15 new findings (line 41)', () => {
    const manyFindings = Array.from({ length: 18 }, (_, i) => ({
      file: `src/file${i}.ts`,
      rule: 'no-console',
      severity: 'high',
      message: `Avoid console ${i}`,
    }));
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/a.ts'],
      newFindings: manyFindings,
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('more');
  });

  it('shows negative delta in red when delta < 0 (line 41)', () => {
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/a.ts'],
      beforeScore: 80,
      afterScore: 75,
      delta: -5,
      improved: false,
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('80');
    expect(calls).toContain('75');
  });

  it('shows zero delta when delta is 0 (line 41)', () => {
    mockAnalyzeDiff.mockReturnValue(makeDiffResult({
      changedFiles: ['src/a.ts'],
      beforeScore: 80,
      afterScore: 80,
      delta: 0,
      improved: false,
    }));
    runDiffCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('80');
  });

  it('passes staged option', () => {
    runDiffCommand('/my/project', undefined, true);
    expect(mockAnalyzeDiff).toHaveBeenCalledWith('/my/project', expect.objectContaining({ staged: true }));
  });
});
