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

let runInteractive: (
  projectDir: string,
  stack: DetectedStack,
  force: boolean,
  dryRun: boolean,
) => Promise<void>;

beforeAll(async () => {
  mockSpinner.mockReturnValue({ start: mockSpinnerStart, stop: mockSpinnerStop });
  mockIsCancel.mockReturnValue(false);
  const mod = await import('../../src/commands/init.js');
  runNonInteractive = mod.runNonInteractive;
  runInteractive = mod.runInteractive;
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

describe('runInteractive', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    mockSelect.mockReset();
    mockMultiselect.mockReset();
    mockConfirm.mockReset();
    mockIsCancel.mockReset();
    mockCancel.mockReset();
    mockNote.mockReset();
    mockIntro.mockReset();
    mockOutro.mockReset();
    mockSpinnerStart.mockReset();
    mockSpinnerStop.mockReset();
    mockSpinner.mockReturnValue({ start: mockSpinnerStart, stop: mockSpinnerStop });
    mockSelect.mockResolvedValue('standard');
    mockMultiselect.mockResolvedValue(['claude']);
    mockConfirm.mockResolvedValue(true);
    mockIsCancel.mockReturnValue(false);
    mockGenerate.mockReturnValue({ created: [], skipped: [] });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('runs without throwing', async () => {
    await expect(runInteractive('/tmp/proj', makeStack(), false, false)).resolves.toBeUndefined();
  });

  it('calls generate with selected tier and tools', async () => {
    mockSelect.mockResolvedValue('enterprise');
    mockMultiselect.mockResolvedValue(['claude', 'cursor']);
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ tier: 'enterprise', tools: ['claude', 'cursor'] }),
    );
  });

  it('calls p.intro and p.outro', async () => {
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(mockIntro).toHaveBeenCalled();
    expect(mockOutro).toHaveBeenCalled();
  });

  it('calls spinner start and stop', async () => {
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(mockSpinnerStart).toHaveBeenCalled();
    expect(mockSpinnerStop).toHaveBeenCalled();
  });

  it('exits when tier is cancelled', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    mockIsCancel.mockReturnValueOnce(true);
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('exits when tools is cancelled', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    mockIsCancel.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('exits when migrate is cancelled', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    mockIsCancel.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true);
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('exits when confirmation is cancelled', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    mockIsCancel
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('exits when confirmation is false (not cancelled)', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    mockIsCancel.mockReturnValue(false);
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('calls p.note with next steps when files created', async () => {
    mockGenerate.mockReturnValue({ created: ['/tmp/proj/CLAUDE.md'], skipped: [] });
    await runInteractive('/tmp/proj', makeStack(), false, false);
    expect(mockNote).toHaveBeenCalled();
  });

  it('calls p.note with migration steps when migrate=true', async () => {
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mockGenerate.mockReturnValue({ created: ['/tmp/proj/CLAUDE.md'], skipped: [] });
    await runInteractive('/tmp/proj', makeStack(), false, false);
    const noteCall = mockNote.mock.calls[0];
    expect(noteCall).toBeDefined();
    expect(noteCall[0]).toContain('migration-audit');
  });

  it('does not call p.note when dryRun=true', async () => {
    mockGenerate.mockReturnValue({ created: ['/tmp/proj/CLAUDE.md'], skipped: [] });
    await runInteractive('/tmp/proj', makeStack(), false, true);
    expect(mockNote).not.toHaveBeenCalled();
  });
});
