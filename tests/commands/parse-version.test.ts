import { beforeAll, describe, expect, it, jest } from '@jest/globals';

const mockReadFileSync = jest.fn<() => string>();

jest.unstable_mockModule('node:fs', () => ({
  readFileSync: mockReadFileSync,
}));

let getCliVersion: (() => string) | undefined;

describe('parse getCliVersion fallback', () => {
  beforeAll(async () => {
    ({ getCliVersion } = await import('../../src/commands/parse.js'));
  });

  it('returns 0.0.0 when package.json cannot be read', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('read failed');
    });
    expect(getCliVersion?.()).toBe('0.0.0');
  });
});
