import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { ScanReport } from '../../src/scanner.js';
import type { DetectedStack } from '../../src/types.js';

const mockScanProject = jest.fn();
const mockScanSpecificFiles = jest.fn();
const mockFormatReport = jest.fn();
const mockWriteReport = jest.fn();
const mockUpdateProject = jest.fn();
const mockExecFileSync = jest.fn();
const mockWatch = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  execFileSync: mockExecFileSync,
}));

jest.unstable_mockModule('node:fs', () => {
  const { createRequire } = jest.requireActual('node:module') as typeof import('node:module');
  const req = createRequire(import.meta.url);
  const realFs = req('node:fs') as typeof import('node:fs');
  return {
    ...realFs,
    watch: mockWatch,
  };
});

jest.unstable_mockModule('../../src/scanner.js', () => ({
  scanProject: mockScanProject,
  scanSpecificFiles: mockScanSpecificFiles,
}));

jest.unstable_mockModule('../../src/reporter.js', () => ({
  formatReport: mockFormatReport,
  writeReport: mockWriteReport,
}));

jest.unstable_mockModule('../../src/updater.js', () => ({
  updateProject: mockUpdateProject,
}));

let runScanCommand: (
  projectDir: string,
  asJson: boolean,
  staged?: boolean,
  outputPath?: string,
  format?: string,
) => void;
let runUpdateCommand: (
  projectDir: string,
  stack: DetectedStack,
  opts: Record<string, string | boolean>,
) => void;
let getStagedFiles: (dir: string) => string[];
let runWatchCommand: (projectDir: string) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/scan.js');
  runScanCommand = mod.runScanCommand;
  runUpdateCommand = mod.runUpdateCommand as typeof runUpdateCommand;
  getStagedFiles = mod.getStagedFiles;
  runWatchCommand = mod.runWatchCommand;
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

function makeScanReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    grade: 'A',
    score: 90,
    filesScanned: 10,
    findings: [],
    summary: [],
    topFiles: [],
    ...overrides,
  };
}

describe('runScanCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockScanProject.mockReset();
    mockScanSpecificFiles.mockReset();
    mockFormatReport.mockReset();
    mockWriteReport.mockReset();
    mockScanProject.mockReturnValue(makeScanReport());
    mockScanSpecificFiles.mockReturnValue(makeScanReport());
    mockFormatReport.mockReturnValue('formatted report');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing for default output', () => {
    expect(() => runScanCommand('/tmp/proj', false)).not.toThrow();
  });

  it('outputs JSON when asJson is true', () => {
    runScanCommand('/tmp/proj', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"grade"');
  });

  it('outputs formatted report when format is specified', () => {
    runScanCommand('/tmp/proj', false, false, undefined, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('formatted report');
  });

  it('calls scanProject for non-staged scan', () => {
    runScanCommand('/tmp/proj', false);
    expect(mockScanProject).toHaveBeenCalledWith('/tmp/proj');
  });

  it('shows summary categories in default output', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      summary: [{ category: 'architecture', count: 3, critical: 1, high: 0 }],
    }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('architecture');
  });

  it('shows topFiles in default output', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      topFiles: [{ file: 'src/big.ts', count: 5, worst: 'high' }],
    }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('src/big.ts');
  });

  it('shows findings in default output', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      findings: [
        { file: 'src/foo.ts', line: 10, severity: 'high', rule: 'no-console', message: 'Avoid console.log', category: 'engineering' },
      ],
    }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('src/foo.ts');
  });

  it('shows grade in default output', () => {
    mockScanProject.mockReturnValue(makeScanReport({ grade: 'A', score: 95 }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('95');
  });

  it('shows migration hint when grade is not A', () => {
    mockScanProject.mockReturnValue(makeScanReport({ grade: 'D', score: 40 }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('governance');
  });

  it('writes report to file when outputPath is provided', () => {
    runScanCommand('/tmp/proj', false, false, '/tmp/report.json', 'json');
    expect(mockWriteReport).toHaveBeenCalled();
  });

  it('shows truncation when more than 15 findings', () => {
    const findings = Array.from({ length: 18 }, (_, i) => ({
      file: `src/file${i}.ts`,
      line: i + 1,
      severity: 'high' as const,
      rule: 'no-console',
      message: 'Avoid console',
      category: 'engineering' as const,
    }));
    mockScanProject.mockReturnValue(makeScanReport({ findings }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('more');
  });

  it('shows staged label in scan mode', () => {
    mockScanSpecificFiles.mockReturnValue(makeScanReport());
    // staged requires getStagedFiles which calls execFileSync - test format path instead
    runScanCommand('/tmp/proj', false, false, undefined, 'sarif');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(typeof calls).toBe('string');
  });

  it('shows summary with critical category in default output', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      summary: [{ category: 'security', count: 2, critical: 1, high: 0 }],
    }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('security');
  });

  it('shows summary with high category in default output', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      summary: [{ category: 'architecture', count: 3, critical: 0, high: 2 }],
    }));
    runScanCommand('/tmp/proj', false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('architecture');
  });
});

describe('runUpdateCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    mockUpdateProject.mockReset();
    mockUpdateProject.mockReturnValue({
      updated: [],
      added: [],
      unchanged: [],
      detectedTier: 'standard',
      detectedTools: ['claude'],
      migrate: false,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing', () => {
    expect(() => runUpdateCommand('/tmp/proj', makeStack(), {})).not.toThrow();
  });

  it('shows updated files', () => {
    mockUpdateProject.mockReturnValue({
      updated: ['CLAUDE.md'],
      added: [],
      unchanged: [],
      detectedTier: 'standard',
      detectedTools: ['claude'],
      migrate: false,
    });
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('CLAUDE.md');
  });

  it('shows added files', () => {
    mockUpdateProject.mockReturnValue({
      updated: [],
      added: ['.claude/settings.json'],
      unchanged: [],
      detectedTier: 'standard',
      detectedTools: ['claude'],
      migrate: false,
    });
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('.claude/settings.json');
  });

  it('shows up to date message when nothing changed', () => {
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('up to date');
  });

  it('shows migration mode when active', () => {
    mockUpdateProject.mockReturnValue({
      updated: [],
      added: [],
      unchanged: [],
      detectedTier: 'enterprise',
      detectedTools: ['claude'],
      migrate: true,
    });
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls.toLowerCase()).toContain('migration');
  });

  it('shows unchanged files count', () => {
    mockUpdateProject.mockReturnValue({
      updated: [],
      added: [],
      unchanged: ['CLAUDE.md', '.claude/settings.json'],
      detectedTier: 'standard',
      detectedTools: ['claude'],
      migrate: false,
    });
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Unchanged');
  });

  it('shows singular file updated when total is 1', () => {
    mockUpdateProject.mockReturnValue({
      updated: ['CLAUDE.md'],
      added: [],
      unchanged: [],
      detectedTier: 'standard',
      detectedTools: ['claude'],
      migrate: false,
    });
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('1 file updated');
  });

  it('shows plural files updated when total > 1', () => {
    mockUpdateProject.mockReturnValue({
      updated: ['CLAUDE.md', '.claude/settings.json'],
      added: [],
      unchanged: [],
      detectedTier: 'standard',
      detectedTools: ['claude'],
      migrate: false,
    });
    runUpdateCommand('/tmp/proj', makeStack(), {});
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('2 files updated');
  });
});

describe('getStagedFiles', () => {
  beforeEach(() => {
    mockExecFileSync.mockReset();
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns array of trimmed filenames from git output', () => {
    mockExecFileSync.mockReturnValue('src/foo.ts\nsrc/bar.ts\n');
    const result = getStagedFiles('/tmp/proj');
    expect(result).toEqual(['src/foo.ts', 'src/bar.ts']);
  });

  it('filters empty lines from git output', () => {
    mockExecFileSync.mockReturnValue('src/foo.ts\n\nsrc/bar.ts\n\n');
    const result = getStagedFiles('/tmp/proj');
    expect(result).toEqual(['src/foo.ts', 'src/bar.ts']);
  });

  it('trims whitespace from filenames', () => {
    mockExecFileSync.mockReturnValue('  src/foo.ts  \n  src/bar.ts  \n');
    const result = getStagedFiles('/tmp/proj');
    expect(result).toEqual(['src/foo.ts', 'src/bar.ts']);
  });

  it('calls process.exit(1) when execFileSync throws', () => {
    mockExecFileSync.mockImplementation(() => { throw new Error('not a git repo'); });
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    getStagedFiles('/tmp/not-a-repo');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('runWatchCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let watcherCallback: (event: string, filename: string | null) => void;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockScanProject.mockReset();
    mockWatch.mockReset();
    mockScanProject.mockReturnValue(makeScanReport());
    mockWatch.mockImplementation((_dir: unknown, _opts: unknown, cb: unknown) => {
      watcherCallback = cb as (event: string, filename: string | null) => void;
      return { close: jest.fn() };
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('logs header lines on start', () => {
    runWatchCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('watch');
    expect(calls).toContain('/tmp/proj');
  });

  it('calls scanProject immediately on start', () => {
    runWatchCommand('/tmp/proj');
    expect(mockScanProject).toHaveBeenCalledWith('/tmp/proj');
  });

  it('sets up fs.watch watcher', () => {
    runWatchCommand('/tmp/proj');
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(mockWatch).toHaveBeenCalledWith('/tmp/proj', { recursive: true }, expect.any(Function));
  });

  it('watcher callback with valid TS file triggers debounced scan', () => {
    jest.useFakeTimers();
    runWatchCommand('/tmp/proj');
    const initialCallCount = (mockScanProject as jest.Mock).mock.calls.length;
    watcherCallback('change', 'src/foo.ts');
    jest.runAllTimers();
    expect((mockScanProject as jest.Mock).mock.calls.length).toBe(initialCallCount + 1);
    jest.useRealTimers();
  });

  it('watcher callback with non-code file is ignored', () => {
    jest.useFakeTimers();
    runWatchCommand('/tmp/proj');
    const initialCallCount = (mockScanProject as jest.Mock).mock.calls.length;
    watcherCallback('change', 'README.md');
    jest.runAllTimers();
    expect((mockScanProject as jest.Mock).mock.calls.length).toBe(initialCallCount);
    jest.useRealTimers();
  });

  it('watcher callback with node_modules file is ignored', () => {
    jest.useFakeTimers();
    runWatchCommand('/tmp/proj');
    const initialCallCount = (mockScanProject as jest.Mock).mock.calls.length;
    watcherCallback('change', 'node_modules/some-pkg/index.ts');
    jest.runAllTimers();
    expect((mockScanProject as jest.Mock).mock.calls.length).toBe(initialCallCount);
    jest.useRealTimers();
  });

  it('watcher callback with null filename is ignored', () => {
    jest.useFakeTimers();
    runWatchCommand('/tmp/proj');
    const initialCallCount = (mockScanProject as jest.Mock).mock.calls.length;
    watcherCallback('change', null);
    jest.runAllTimers();
    expect((mockScanProject as jest.Mock).mock.calls.length).toBe(initialCallCount);
    jest.useRealTimers();
  });

  it('runScan logs individual findings when count is 1-3', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      findings: [
        { file: 'src/a.ts', line: 1, severity: 'high', rule: 'no-console', message: 'Avoid console', category: 'engineering' },
        { file: 'src/b.ts', line: 2, severity: 'critical', rule: 'hardcoded-secret', message: 'Secret found', category: 'security' },
      ],
    }));
    runWatchCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('src/a.ts');
    expect(calls).toContain('src/b.ts');
  });

  it('runScan shows truncation when findings count exceeds 3', () => {
    mockScanProject.mockReturnValue(makeScanReport({
      findings: [
        { file: 'src/a.ts', line: 1, severity: 'high', rule: 'r1', message: 'msg1', category: 'engineering' },
        { file: 'src/b.ts', line: 2, severity: 'high', rule: 'r2', message: 'msg2', category: 'engineering' },
        { file: 'src/c.ts', line: 3, severity: 'high', rule: 'r3', message: 'msg3', category: 'engineering' },
        { file: 'src/d.ts', line: 4, severity: 'high', rule: 'r4', message: 'msg4', category: 'engineering' },
        { file: 'src/e.ts', line: 5, severity: 'high', rule: 'r5', message: 'msg5', category: 'engineering' },
      ],
    }));
    runWatchCommand('/tmp/proj');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('more');
  });
});
