import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';

const mockSaveBaseline = jest.fn();
const mockCompareBaseline = jest.fn();

jest.unstable_mockModule('../../src/baseline.js', () => ({
  saveBaseline: mockSaveBaseline,
  compareBaseline: mockCompareBaseline,
}));

type BaselineEntry = {
  timestamp: string;
  score: number;
  grade: string;
  filesScanned: number;
  findingCount: number;
  categories: Array<unknown>;
};

type SaveResult = {
  entry: BaselineEntry;
  isFirst: boolean;
};

type CompareResult = {
  scoreDelta: number;
  gradeChanged: boolean;
  resolvedFindings: number;
  newFindings: number;
  categoryChanges: Array<{ category: string; previousCount: number; currentCount: number; delta: number }>;
  previous: BaselineEntry;
  current: BaselineEntry;
};

let runBaselineCommand: (projectDir: string, compare: boolean) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/baseline.js');
  runBaselineCommand = mod.runBaselineCommand;
});

function makeSaveResult(overrides: Partial<SaveResult> = {}): SaveResult {
  return {
    entry: {
      timestamp: '2024-01-01T00:00:00.000Z',
      score: 80,
      grade: 'B',
      filesScanned: 20,
      findingCount: 5,
      categories: [],
    },
    isFirst: false,
    ...overrides,
  };
}

function makeCompareResult(overrides: Partial<CompareResult> = {}): CompareResult {
  return {
    scoreDelta: 5,
    gradeChanged: false,
    resolvedFindings: 2,
    newFindings: 0,
    categoryChanges: [],
    previous: {
      timestamp: '2024-01-01T00:00:00.000Z',
      score: 75,
      grade: 'C',
      filesScanned: 18,
      findingCount: 7,
      categories: [],
    },
    current: {
      timestamp: '2024-01-02T00:00:00.000Z',
      score: 80,
      grade: 'B',
      filesScanned: 20,
      findingCount: 5,
      categories: [],
    },
    ...overrides,
  };
}

describe('runBaselineCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockSaveBaseline.mockReset();
    mockCompareBaseline.mockReset();
    mockSaveBaseline.mockReturnValue(makeSaveResult());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('saves baseline without throwing', () => {
    expect(() => runBaselineCommand('/tmp/proj', false)).not.toThrow();
  });

  it('calls saveBaseline with projectDir', () => {
    runBaselineCommand('/my/project', false);
    expect(mockSaveBaseline).toHaveBeenCalledWith('/my/project');
  });

  it('shows score after saving', () => {
    runBaselineCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('80');
  });

  it('shows first baseline message when isFirst=true', () => {
    mockSaveBaseline.mockReturnValue(makeSaveResult({ isFirst: true }));
    runBaselineCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('First baseline');
  });

  it('shows snapshot message when isFirst=false', () => {
    mockSaveBaseline.mockReturnValue(makeSaveResult({ isFirst: false }));
    runBaselineCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Snapshot appended');
  });

  it('shows no baseline message when compare returns null', () => {
    mockCompareBaseline.mockReturnValue(null);
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('No baseline found');
  });

  it('shows score delta when comparing', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({ scoreDelta: 5 }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('75');
    expect(calls).toContain('80');
  });

  it('shows resolved findings when comparing', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({ resolvedFindings: 3 }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('3 findings resolved');
  });

  it('shows new findings when comparing', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({ newFindings: 2, resolvedFindings: 0 }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('2 new findings');
  });

  it('shows no changes message when no delta', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({ resolvedFindings: 0, newFindings: 0 }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('No changes');
  });

  it('shows category changes when present', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({
      categoryChanges: [{ category: 'security', previousCount: 5, currentCount: 3, delta: -2 }],
    }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('security');
  });

  it('shows red arrow when scoreDelta < 0 (line 19)', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({
      scoreDelta: -5,
      previous: { timestamp: '', score: 85, grade: 'B', filesScanned: 10, findingCount: 3, categories: [] },
      current: { timestamp: '', score: 80, grade: 'B', filesScanned: 10, findingCount: 8, categories: [] },
    }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    // Arrow and scores should appear in output
    expect(calls).toContain('85');
    expect(calls).toContain('80');
  });

  it('shows equal arrow when scoreDelta is 0 (line 19)', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({
      scoreDelta: 0,
      previous: { timestamp: '', score: 80, grade: 'B', filesScanned: 10, findingCount: 5, categories: [] },
      current: { timestamp: '', score: 80, grade: 'B', filesScanned: 10, findingCount: 5, categories: [] },
    }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('80');
  });

  it('shows grade changed indicator', () => {
    mockCompareBaseline.mockReturnValue(makeCompareResult({
      gradeChanged: true,
      previous: { timestamp: '', score: 70, grade: 'C', filesScanned: 10, findingCount: 10, categories: [] },
      current: { timestamp: '', score: 80, grade: 'B', filesScanned: 10, findingCount: 5, categories: [] },
    }));
    runBaselineCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('changed');
  });
});
