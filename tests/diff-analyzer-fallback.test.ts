import {
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

const mockExecFileSync = jest.fn();
const mockMkdtempSync = jest.fn();
const realFs = jest.requireActual('node:fs') as Record<string, unknown>;

const mockScanProject = jest.fn();
const mockScanSpecificFiles = jest.fn();
const mockLoadBaseline = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  execFileSync: mockExecFileSync,
}));

jest.unstable_mockModule('node:fs', () => ({
  ...realFs,
  mkdtempSync: mockMkdtempSync,
}));

jest.unstable_mockModule('../src/scanner.js', () => ({
  scanProject: mockScanProject,
  scanSpecificFiles: mockScanSpecificFiles,
}));

jest.unstable_mockModule('../src/baseline.js', () => ({
  loadBaseline: mockLoadBaseline,
}));

describe('diff-analyzer defensive fallback', () => {
  let analyzeDiff: (typeof import('../src/diff-analyzer.js'))['analyzeDiff'];

  beforeAll(async () => {
    const mod = await import('../src/diff-analyzer.js');
    analyzeDiff = mod.analyzeDiff;
  });

  it('returns empty base findings when temp dir creation fails', () => {
    mockExecFileSync.mockReset();
    mockMkdtempSync.mockReset();
    mockScanProject.mockReset();
    mockScanSpecificFiles.mockReset();
    mockLoadBaseline.mockReset();

    mockExecFileSync.mockReturnValue('src/a.ts\n');
    mockMkdtempSync.mockImplementation(() => {
      throw new Error('mkdtemp failed');
    });

    mockScanProject.mockReturnValue({ score: 95, findings: [] });
    mockScanSpecificFiles.mockReturnValue({ findings: [] });
    mockLoadBaseline.mockReturnValue(null);

    const result = analyzeDiff('/tmp/project', { staged: true });

    expect(result.changedFiles).toEqual(['src/a.ts']);
    expect(result.resolvedFindings).toEqual([]);
    expect(result.newFindings).toEqual([]);
    expect(result.summary).toContain('resolved');
  });
});
