import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockExecFileSync = jest.fn();
const mockMkdtempSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockRmSync = jest.fn();
const mockScanProject = jest.fn();
const mockScanSpecificFiles = jest.fn();
const mockLoadBaseline = jest.fn();

let analyzeDiff: (dir: string, opts?: { base?: string; head?: string; staged?: boolean }) => {
  changedFiles: string[];
  beforeScore: number;
  afterScore: number;
  delta: number;
  improved: boolean;
  newFindings: Array<{ file: string; rule: string; severity: string; message: string }>;
  resolvedFindings: Array<{ file: string; rule: string; severity: string; message: string }>;
  summary: string;
};

function getExecArgs(callArgs: unknown[]): string[] {
  const maybeArgs = callArgs[1];
  return Array.isArray(maybeArgs) ? (maybeArgs as string[]) : [];
}

describe('diff-analyzer branch coverage', () => {
  beforeAll(async () => {
    jest.unstable_mockModule('node:child_process', () => ({
      execFileSync: mockExecFileSync,
    }));
    const realFs = jest.requireActual('node:fs') as Record<string, unknown>;
    jest.unstable_mockModule('node:fs', () => ({
      ...realFs,
      mkdtempSync: mockMkdtempSync,
      writeFileSync: mockWriteFileSync,
      rmSync: mockRmSync,
    }));
    jest.unstable_mockModule('../src/scanner.js', () => ({
      scanProject: mockScanProject,
      scanSpecificFiles: mockScanSpecificFiles,
    }));
    jest.unstable_mockModule('../src/baseline.js', () => ({
      loadBaseline: mockLoadBaseline,
    }));

    ({ analyzeDiff } = await import('../src/diff-analyzer.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdtempSync.mockReturnValue('/tmp/forge-diff-123');
  });

  it('uses main as default base when opts.staged is false', () => {
    mockExecFileSync.mockImplementation((...callArgs) => {
      const args = getExecArgs(callArgs);
      if (args[0] === 'diff' && args[2] === 'main...HEAD') return 'src/a.ts\n';
      if (args[0] === '-C' && args[1] === '/repo' && args[2] === 'show') return 'const a = 1;\n';
      return '';
    });

    mockLoadBaseline.mockReturnValue({ history: [{ score: 100 }] });
    mockScanProject.mockReturnValue({ score: 90, findings: [] });
    mockScanSpecificFiles.mockImplementation((dir) => {
      if (dir === '/tmp/forge-diff-123') return { findings: [] };
      return {
        findings: [
          {
            file: 'src/a.ts',
            rule: 'demo-rule',
            severity: 'high',
            message: 'new issue',
          },
        ],
      };
    });

    const result = analyzeDiff('/repo');

    expect(result.changedFiles).toEqual(['src/a.ts']);
    expect(result.improved).toBe(false);
    expect(result.summary).toContain('degraded');
    expect(result.summary).toContain('1 new finding.');
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'show', 'main:src/a.ts'],
      expect.any(Object),
    );
  });

  it('uses HEAD as base when opts.staged is true and reports plural resolved findings', () => {
    mockExecFileSync.mockImplementation((...callArgs) => {
      const args = getExecArgs(callArgs);
      if (args[0] === 'diff' && args[1] === '--cached') return 'src/a.ts\nsrc/b.ts\n';
      if (args[0] === '-C' && args[2] === 'show') return 'legacy content\n';
      return '';
    });

    mockLoadBaseline.mockReturnValue({ history: [{ score: 100 }] });
    mockScanProject.mockReturnValue({ score: 110, findings: [] });
    mockScanSpecificFiles.mockImplementation((dir) => {
      if (dir === '/tmp/forge-diff-123') {
        return {
          findings: [
            { file: 'a.ts', rule: 'r1', severity: 'medium', message: 'old-1' },
            { file: 'b.ts', rule: 'r2', severity: 'medium', message: 'old-2' },
          ],
        };
      }
      return { findings: [] };
    });

    const result = analyzeDiff('/repo', { staged: true });

    expect(result.improved).toBe(true);
    expect(result.resolvedFindings).toHaveLength(2);
    expect(result.summary).toContain('improved');
    expect(result.summary).toContain('findings resolved.');
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'show', 'HEAD:src/a.ts'],
      expect.any(Object),
    );
  });

  it('falls back to scanned finding file when temp-file mapping misses', () => {
    mockExecFileSync.mockImplementation((...callArgs) => {
      const args = getExecArgs(callArgs);
      if (args[0] === 'diff' && args[1] === '--cached') return 'src/a.ts\n';
      if (args[0] === '-C' && args[2] === 'show') return 'legacy content\n';
      return '';
    });

    mockLoadBaseline.mockReturnValue({ history: [{ score: 100 }] });
    mockScanProject.mockReturnValue({ score: 110, findings: [] });
    mockScanSpecificFiles.mockImplementation((dir) => {
      if (dir === '/tmp/forge-diff-123') {
        return {
          findings: [
            { file: 'missing.ts', rule: 'r1', severity: 'medium', message: 'old' },
          ],
        };
      }
      return { findings: [] };
    });

    const result = analyzeDiff('/repo', { staged: true });

    expect(result.resolvedFindings).toHaveLength(1);
    expect(result.resolvedFindings[0]?.file).toBe('missing.ts');
  });
});
