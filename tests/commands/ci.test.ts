import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const mockGenerateCiPipeline = jest.fn();

jest.unstable_mockModule('../../src/ci-command.js', () => ({
  generateCiPipeline: mockGenerateCiPipeline,
}));

type CiResult = {
  provider: string;
  filePath: string;
  content: string;
  commands: string[];
};

let runCiCommand: (
  projectDir: string,
  provider?: string,
  phase?: string,
  threshold?: number,
  format?: string,
  asJson?: boolean,
) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/ci.js');
  runCiCommand = mod.runCiCommand;
});

function makeCiResult(overrides: Partial<CiResult> = {}): CiResult {
  return {
    provider: 'github-actions',
    filePath: '.github/workflows/forge.yml',
    content: 'name: forge\n',
    commands: ['npx forge-ai-init gate'],
    ...overrides,
  };
}

describe('runCiCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let tmpDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    tmpDir = mkdtempSync(join(tmpdir(), 'forge-ci-test-'));
    mockGenerateCiPipeline.mockReset();
    mockGenerateCiPipeline.mockReturnValue(makeCiResult());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows available providers when no provider given', () => {
    runCiCommand(tmpDir);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('github-actions');
    expect(calls).toContain('gitlab-ci');
  });

  it('calls generateCiPipeline with provider', () => {
    runCiCommand(tmpDir, 'github-actions');
    expect(mockGenerateCiPipeline).toHaveBeenCalledWith(tmpDir, expect.objectContaining({ provider: 'github-actions' }));
  });

  it('writes file to disk by default', () => {
    runCiCommand(tmpDir, 'github-actions');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('Created');
  });

  it('outputs JSON when asJson=true', () => {
    runCiCommand(tmpDir, 'github-actions', undefined, undefined, undefined, true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"provider"');
  });

  it('calls process.exit for invalid provider', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    runCiCommand(tmpDir, 'invalid-provider');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('passes phase to generateCiPipeline', () => {
    runCiCommand(tmpDir, 'github-actions', 'production');
    expect(mockGenerateCiPipeline).toHaveBeenCalledWith(tmpDir, expect.objectContaining({ phase: 'production' }));
  });

  it('shows commands in output', () => {
    mockGenerateCiPipeline.mockReturnValue(makeCiResult({ commands: ['npx forge-ai-init gate --phase production'] }));
    runCiCommand(tmpDir, 'github-actions');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('npx forge-ai-init gate');
  });

  it('handles gitlab-ci provider', () => {
    mockGenerateCiPipeline.mockReturnValue(makeCiResult({
      provider: 'gitlab-ci',
      filePath: '.gitlab-ci.yml',
    }));
    runCiCommand(tmpDir, 'gitlab-ci');
    expect(mockGenerateCiPipeline).toHaveBeenCalledWith(tmpDir, expect.objectContaining({ provider: 'gitlab-ci' }));
  });
});
