import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const mockScaffold = jest.fn();

jest.unstable_mockModule('../../src/scaffold.js', () => ({
  scaffold: mockScaffold,
  TEMPLATE_LIST: [
    { id: 'nextjs-app', description: 'Next.js App Router application' },
    { id: 'express-api', description: 'Express.js REST API' },
    { id: 'fastapi-service', description: 'FastAPI microservice' },
    { id: 'ts-library', description: 'TypeScript library' },
    { id: 'cli-tool', description: 'Node.js CLI tool' },
  ],
}));

type ScaffoldResult = {
  created: string[];
  template: string;
  projectDir: string;
};

let runScaffoldCommand: (
  projectDir: string,
  template?: string,
  name?: string,
  asJson?: boolean,
) => void;

beforeAll(async () => {
  const mod = await import('../../src/commands/scaffold.js');
  runScaffoldCommand = mod.runScaffoldCommand;
});

function makeScaffoldResult(overrides: Partial<ScaffoldResult> = {}): ScaffoldResult {
  return {
    created: ['package.json', 'CLAUDE.md', 'src/index.ts'],
    template: 'nextjs-app',
    projectDir: '/tmp/my-project',
    ...overrides,
  };
}

describe('runScaffoldCommand', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let tmpDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn() as never);
    jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
    tmpDir = mkdtempSync(join(tmpdir(), 'forge-scaffold-test-'));
    mockScaffold.mockReset();
    mockScaffold.mockReturnValue(makeScaffoldResult());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows template list when no template given', () => {
    runScaffoldCommand(tmpDir);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('nextjs-app');
    expect(calls).toContain('express-api');
  });

  it('calls process.exit when name not provided', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    runScaffoldCommand(tmpDir, 'nextjs-app');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('calls process.exit for invalid template', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    runScaffoldCommand(tmpDir, 'unknown-template', 'my-app');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('calls scaffold with correct args', () => {
    runScaffoldCommand(tmpDir, 'nextjs-app', 'my-app');
    expect(mockScaffold).toHaveBeenCalledWith({ template: 'nextjs-app', name: 'my-app', dir: tmpDir });
  });

  it('shows created files in output', () => {
    runScaffoldCommand(tmpDir, 'nextjs-app', 'my-project');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('CLAUDE.md');
  });

  it('outputs JSON when asJson is true', () => {
    runScaffoldCommand(tmpDir, 'nextjs-app', 'my-app', true);
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"created"');
  });

  it('shows template and location in output', () => {
    runScaffoldCommand(tmpDir, 'nextjs-app', 'my-project');
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('nextjs-app');
  });

  it('shows express-api template', () => {
    mockScaffold.mockReturnValue(makeScaffoldResult({ template: 'express-api' }));
    runScaffoldCommand(tmpDir, 'express-api', 'my-api');
    expect(mockScaffold).toHaveBeenCalledWith(expect.objectContaining({ template: 'express-api' }));
  });
});
