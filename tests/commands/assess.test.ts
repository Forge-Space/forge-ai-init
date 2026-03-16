import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DetectedStack } from '../../src/types.js';
import type { AssessmentReport } from '../../src/assessor.js';

const mockAssessProject = jest.fn();
const mockWriteReport = jest.fn();

jest.unstable_mockModule('../../src/assessor.js', () => ({
  assessProject: mockAssessProject,
}));

jest.unstable_mockModule('../../src/reporter.js', () => ({
  writeReport: mockWriteReport,
}));

let runAssessCommand: (
  projectDir: string,
  stack: DetectedStack,
  asJson: boolean,
  outputPath?: string,
  format?: string,
) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/assess.js');
  runAssessCommand = mod.runAssessCommand;
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

function makeAssessmentReport(overrides: Partial<AssessmentReport> = {}): AssessmentReport {
  return {
    overallGrade: 'B',
    overallScore: 75,
    filesScanned: 42,
    categories: [],
    findings: [],
    migrationStrategy: 'greenfield',
    migrationReadiness: 'ready',
    summary: '',
    ...overrides,
  };
}

describe('runAssessCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let tmpDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    tmpDir = mkdtempSync(join(tmpdir(), 'forge-assess-test-'));
    mockAssessProject.mockReset();
    mockAssessProject.mockReturnValue(makeAssessmentReport());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs without throwing for default output', () => {
    expect(() => runAssessCommand('/tmp/proj', makeStack(), false)).not.toThrow();
  });

  it('outputs JSON when asJson is true', () => {
    const report = makeAssessmentReport({ overallScore: 80 });
    mockAssessProject.mockReturnValue(report);
    runAssessCommand('/tmp/proj', makeStack(), true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('overallScore');
  });

  it('outputs markdown format when format=markdown', () => {
    runAssessCommand('/tmp/proj', makeStack(), false, undefined, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('forge-ai-init Assessment Report');
  });

  it('outputs JSON format when format=json', () => {
    runAssessCommand('/tmp/proj', makeStack(), false, undefined, 'json');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('overallScore');
  });

  it('writes markdown to file when outputPath and format=markdown', () => {
    const outputPath = join(tmpDir, 'report.md');
    runAssessCommand('/tmp/proj', makeStack(), false, outputPath, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain(outputPath);
  });

  it('writes JSON to file when outputPath without format', () => {
    const outputPath = join(tmpDir, 'report.json');
    runAssessCommand('/tmp/proj', makeStack(), false, outputPath);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain(outputPath);
  });

  it('shows categories in default output', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({
      categories: [
        { category: 'dependencies', score: 70, grade: 'C', findings: 5, critical: 1, high: 0 },
      ],
    }));
    runAssessCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls.toLowerCase()).toContain('dependencies');
  });

  it('shows critical findings in default output', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({
      findings: [
        { severity: 'critical', category: 'dependencies', title: 'Outdated dep', file: 'package.json', detail: 'Outdated dep details' },
      ],
    }));
    runAssessCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Outdated dep');
  });

  it('shows high findings in default output', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({
      findings: [
        { severity: 'high', category: 'security', title: 'Vuln found', detail: 'Vulnerability details' },
      ],
    }));
    runAssessCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Vuln found');
  });

  it('calls assessProject with projectDir', () => {
    runAssessCommand('/my/project', makeStack(), false);
    expect(mockAssessProject).toHaveBeenCalledWith('/my/project', expect.any(Object));
  });

  it('shows needs-work readiness', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({ migrationReadiness: 'needs-work' }));
    runAssessCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('needs-work');
  });

  it('shows high-risk readiness', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({ migrationReadiness: 'high-risk' }));
    runAssessCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('high-risk');
  });

  it('outputs markdown format with critical findings that have file path', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({
      findings: [
        { severity: 'critical', category: 'security', title: 'Secret exposed', detail: 'Hardcoded credential found', file: 'src/config.ts' },
        { severity: 'high', category: 'dependencies', title: 'Outdated dep', detail: 'Using very old version' },
      ],
    }));
    runAssessCommand('/tmp/proj', makeStack(), false, undefined, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Critical');
  });

  it('outputs markdown format without critical findings', () => {
    mockAssessProject.mockReturnValue(makeAssessmentReport({
      findings: [
        { severity: 'low', category: 'quality', title: 'Minor issue', detail: 'Small problem' },
      ],
    }));
    runAssessCommand('/tmp/proj', makeStack(), false, undefined, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Assessment Report');
  });

  it('writes markdown with critical findings to file', () => {
    const outputPath = join(tmpDir, 'report-critical.md');
    mockAssessProject.mockReturnValue(makeAssessmentReport({
      findings: [
        { severity: 'critical', category: 'security', title: 'Vuln', detail: 'Details', file: 'src/auth.ts' },
      ],
    }));
    runAssessCommand('/tmp/proj', makeStack(), false, outputPath, 'markdown');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain(outputPath);
  });

  it('shows more than 10 findings truncation in default output', () => {
    const findings = Array.from({ length: 12 }, (_, i) => ({
      severity: 'critical' as const,
      category: 'security' as const,
      title: `Issue ${i}`,
      detail: `Details ${i}`,
    }));
    mockAssessProject.mockReturnValue(makeAssessmentReport({ findings }));
    runAssessCommand('/tmp/proj', makeStack(), false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('more');
  });
});
