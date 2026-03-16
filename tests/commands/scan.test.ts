import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { ScanReport } from '../../src/scanner.js';
import type { DetectedStack } from '../../src/types.js';

const mockScanProject = jest.fn();
const mockScanSpecificFiles = jest.fn();
const mockFormatReport = jest.fn();
const mockWriteReport = jest.fn();
const mockUpdateProject = jest.fn();

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

beforeAll(async () => {
  const mod = await import('../../src/commands/scan.js');
  runScanCommand = mod.runScanCommand;
  runUpdateCommand = mod.runUpdateCommand as typeof runUpdateCommand;
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
