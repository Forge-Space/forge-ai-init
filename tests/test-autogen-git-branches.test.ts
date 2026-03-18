import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockExistsSync = jest.fn();
const mockExecFileSync = jest.fn();

describe('test-autogen git branch coverage', () => {
  beforeAll(async () => {
    jest.unstable_mockModule('node:fs', () => ({
      existsSync: mockExistsSync,
    }));

    jest.unstable_mockModule('node:child_process', () => ({
      execFileSync: mockExecFileSync,
    }));

    await import('../src/test-autogen/git.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when no git binary candidate exists', async () => {
    mockExistsSync.mockReturnValue(false);

    const git = await import('../src/test-autogen/git.js');
    expect(() => git.resolveGitBinary()).toThrow(
      'Git binary not found in expected locations',
    );
  });

  it('falls back to HEAD diff when baseRef is unsafe', async () => {
    mockExistsSync.mockReturnValue(true);
    mockExecFileSync.mockReturnValue('src/a.ts\n\n');

    const git = await import('../src/test-autogen/git.js');
    const files = git.readChangedFiles('/tmp/project', {
      baseRef: 'main;rm -rf /',
      staged: false,
    });

    expect(files).toEqual(['src/a.ts']);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/bin/git',
      ['diff', '--name-only', 'HEAD'],
      expect.objectContaining({ cwd: '/tmp/project' }),
    );
  });

  it('uses --cached diff args when staged=true', async () => {
    mockExistsSync.mockReturnValue(true);
    mockExecFileSync.mockReturnValue('src/b.ts\n');

    const git = await import('../src/test-autogen/git.js');
    const files = git.readChangedFiles('/tmp/project', {
      staged: true,
      baseRef: 'main',
    });

    expect(files).toEqual(['src/b.ts']);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/bin/git',
      ['diff', '--cached', '--name-only'],
      expect.objectContaining({ cwd: '/tmp/project' }),
    );
  });
});
