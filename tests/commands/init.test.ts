import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import type { DetectedStack } from '../../src/types.js';

const mockGenerate = jest.fn();
const mockIntro = jest.fn();
const mockOutro = jest.fn();
const mockLogInfo = jest.fn();
const mockLogSuccess = jest.fn();
const mockLogWarn = jest.fn();
const mockSpinnerStart = jest.fn();
const mockSpinnerStop = jest.fn();
const mockSpinner = jest.fn();
const mockSelect = jest.fn();
const mockMultiselect = jest.fn();
const mockConfirm = jest.fn();
const mockIsCancel = jest.fn();
const mockCancel = jest.fn();
const mockNote = jest.fn();

jest.unstable_mockModule('../../src/generator.js', () => ({
  generate: mockGenerate,
}));

jest.unstable_mockModule('@clack/prompts', () => ({
  intro: mockIntro,
  outro: mockOutro,
  log: { info: mockLogInfo, success: mockLogSuccess, warn: mockLogWarn },
  spinner: mockSpinner,
  select: mockSelect,
  multiselect: mockMultiselect,
  confirm: mockConfirm,
  isCancel: mockIsCancel,
  cancel: mockCancel,
  note: mockNote,
}));

let runNonInteractive: (
  projectDir: string,
  stack: DetectedStack,
  tier: string,
  tools: string[],
  force: boolean,
  dryRun: boolean,
  migrate: boolean,
) => void;

beforeAll(async () => {
  mockSpinner.mockReturnValue({ start: mockSpinnerStart, stop: mockSpinnerStop });
  mockIsCancel.mockReturnValue(false);
  const mod = await import('../../src/commands/init.js');
  runNonInteractive = mod.runNonInteractive;
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

describe('runNonInteractive', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockGenerate.mockReset();
    mockGenerate.mockReturnValue({ created: [], skipped: [] });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing', () => {
    expect(() => runNonInteractive('/tmp/proj', makeStack(), 'standard', ['claude'], false, false, false)).not.toThrow();
  });

  it('calls generate with correct options', () => {
    runNonInteractive('/my/project', makeStack(), 'enterprise', ['claude', 'cursor'], false, false, false);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        projectDir: '/my/project',
        tier: 'enterprise',
        tools: ['claude', 'cursor'],
        force: false,
        dryRun: false,
        migrate: false,
      }),
    );
  });

  it('shows dry run message when dryRun=true', () => {
    runNonInteractive('/tmp/proj', makeStack(), 'standard', ['claude'], false, true, false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Dry run');
  });

  it('shows created files in output', () => {
    mockGenerate.mockReturnValue({ created: ['/tmp/proj/CLAUDE.md'], skipped: [] });
    runNonInteractive('/tmp/proj', makeStack(), 'standard', ['claude'], false, false, false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('CLAUDE.md');
  });

  it('shows skipped files in output', () => {
    mockGenerate.mockReturnValue({ created: [], skipped: ['/tmp/proj/CLAUDE.md'] });
    runNonInteractive('/tmp/proj', makeStack(), 'standard', ['claude'], false, false, false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('CLAUDE.md');
  });

  it('shows tier in output', () => {
    runNonInteractive('/tmp/proj', makeStack(), 'lite', ['claude'], false, false, false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('lite');
  });

  it('shows migration mode label when migrate=true', () => {
    runNonInteractive('/tmp/proj', makeStack(), 'enterprise', ['claude'], false, false, true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('migration');
  });

  it('shows Done message when files created', () => {
    mockGenerate.mockReturnValue({ created: ['/tmp/proj/CLAUDE.md'], skipped: [] });
    runNonInteractive('/tmp/proj', makeStack(), 'standard', ['claude'], false, false, false);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Done');
  });

  it('shows migration next steps when migrate=true and files created', () => {
    mockGenerate.mockReturnValue({ created: ['/tmp/proj/CLAUDE.md'], skipped: [] });
    runNonInteractive('/tmp/proj', makeStack(), 'enterprise', ['claude'], false, false, true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('migration-audit');
  });

  it('handles nothing to generate gracefully', () => {
    mockGenerate.mockReturnValue({ created: [], skipped: [] });
    expect(() => runNonInteractive('/tmp/proj', makeStack(), 'standard', ['claude'], false, false, false)).not.toThrow();
  });
});
