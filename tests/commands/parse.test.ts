import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getCliVersion,
  parseArgs,
  parseTier,
  parseTools,
  printUsage,
} from '../../src/commands/parse.js';

describe('parse commands', () => {
  let mockExit: ReturnType<typeof jest.spyOn>;
  let mockConsoleError: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(jest.fn() as never);
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(jest.fn() as never);
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('getCliVersion', () => {
    it('returns a string version', () => {
      const version = getCliVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    it('returns semver-like string', () => {
      const version = getCliVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('printUsage', () => {
    it('prints usage help text', () => {
      const mockConsoleLog = jest
        .spyOn(console, 'log')
        .mockImplementation(jest.fn() as never);
      try {
        printUsage();
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(String(mockConsoleLog.mock.calls[0]?.[0] ?? '')).toContain(
          'forge-ai-init',
        );
      } finally {
        mockConsoleLog.mockRestore();
      }
    });
  });

  describe('parseArgs', () => {
    it('returns empty object for empty args', () => {
      const result = parseArgs([]);
      expect(result).toEqual({});
    });

    it('parses --force flag', () => {
      const result = parseArgs(['--force']);
      expect(result['force']).toBe(true);
    });

    it('parses --dry-run flag', () => {
      const result = parseArgs(['--dry-run']);
      expect(result['dry-run']).toBe(true);
    });

    it('parses --yes flag', () => {
      const result = parseArgs(['--yes']);
      expect(result['yes']).toBe(true);
    });

    it('parses -y as yes', () => {
      const result = parseArgs(['-y']);
      expect(result['yes']).toBe(true);
    });

    it('parses --help flag', () => {
      const result = parseArgs(['--help']);
      expect(result['help']).toBe(true);
    });

    it('parses -h as help', () => {
      const result = parseArgs(['-h']);
      expect(result['help']).toBe(true);
    });

    it('parses --migrate flag', () => {
      const result = parseArgs(['--migrate']);
      expect(result['migrate']).toBe(true);
    });

    it('parses --json flag', () => {
      const result = parseArgs(['--json']);
      expect(result['json']).toBe(true);
    });

    it('parses --staged flag', () => {
      const result = parseArgs(['--staged']);
      expect(result['staged']).toBe(true);
    });

    it('parses --watch flag', () => {
      const result = parseArgs(['--watch']);
      expect(result['watch']).toBe(true);
    });

    it('parses --compare flag', () => {
      const result = parseArgs(['--compare']);
      expect(result['compare']).toBe(true);
    });

    it('parses --write flag', () => {
      const result = parseArgs(['--write']);
      expect(result['write']).toBe(true);
    });

    it('parses --check flag', () => {
      const result = parseArgs(['--check']);
      expect(result['check']).toBe(true);
    });

    it('parses check command', () => {
      const result = parseArgs(['check']);
      expect(result['command']).toBe('check');
    });

    it('parses migrate command', () => {
      const result = parseArgs(['migrate']);
      expect(result['command']).toBe('migrate');
    });

    it('parses update command', () => {
      const result = parseArgs(['update']);
      expect(result['command']).toBe('update');
    });

    it('parses assess command', () => {
      const result = parseArgs(['assess']);
      expect(result['command']).toBe('assess');
    });

    it('parses baseline command', () => {
      const result = parseArgs(['baseline']);
      expect(result['command']).toBe('baseline');
    });

    it('parses plan command', () => {
      const result = parseArgs(['plan']);
      expect(result['command']).toBe('plan');
    });

    it('parses doctor command', () => {
      const result = parseArgs(['doctor']);
      expect(result['command']).toBe('doctor');
    });

    it('parses gate command', () => {
      const result = parseArgs(['gate']);
      expect(result['command']).toBe('gate');
    });

    it('parses test-autogen command', () => {
      const result = parseArgs(['test-autogen']);
      expect(result['command']).toBe('test-autogen');
    });

    it('parses scaffold command', () => {
      const result = parseArgs(['scaffold']);
      expect(result['command']).toBe('scaffold');
    });

    it('parses migrate-plan command', () => {
      const result = parseArgs(['migrate-plan']);
      expect(result['command']).toBe('migrate-plan');
    });

    it('parses ci command', () => {
      const result = parseArgs(['ci']);
      expect(result['command']).toBe('ci');
    });

    it('parses diff command', () => {
      const result = parseArgs(['diff']);
      expect(result['command']).toBe('diff');
    });

    it('parses --dir with value', () => {
      const result = parseArgs(['--dir', '/some/path']);
      expect(result['dir']).toBe('/some/path');
    });

    it('parses --tier with value', () => {
      const result = parseArgs(['--tier', 'enterprise']);
      expect(result['tier']).toBe('enterprise');
    });

    it('parses --tools with value', () => {
      const result = parseArgs(['--tools', 'claude,cursor']);
      expect(result['tools']).toBe('claude,cursor');
    });

    it('ignores option flags without a value', () => {
      const result = parseArgs(['--dir']);
      expect(result['dir']).toBeUndefined();
    });

    it('parses multiple flags together', () => {
      const result = parseArgs(['--force', '--yes', '--tier', 'lite']);
      expect(result['force']).toBe(true);
      expect(result['yes']).toBe(true);
      expect(result['tier']).toBe('lite');
    });
  });

  describe('parseTier', () => {
    it('returns standard for undefined', () => {
      expect(parseTier(undefined)).toBe('standard');
    });

    it('returns lite for lite', () => {
      expect(parseTier('lite')).toBe('lite');
    });

    it('returns standard for standard', () => {
      expect(parseTier('standard')).toBe('standard');
    });

    it('returns enterprise for enterprise', () => {
      expect(parseTier('enterprise')).toBe('enterprise');
    });

    it('calls process.exit for invalid tier', () => {
      parseTier('invalid');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('parseTools', () => {
    it('returns [claude] for undefined', () => {
      expect(parseTools(undefined)).toEqual(['claude']);
    });

    it('returns claude for claude', () => {
      expect(parseTools('claude')).toEqual(['claude']);
    });

    it('returns cursor for cursor', () => {
      expect(parseTools('cursor')).toEqual(['cursor']);
    });

    it('returns windsurf for windsurf', () => {
      expect(parseTools('windsurf')).toEqual(['windsurf']);
    });

    it('returns copilot for copilot', () => {
      expect(parseTools('copilot')).toEqual(['copilot']);
    });

    it('returns multiple tools', () => {
      const result = parseTools('claude,cursor');
      expect(result).toEqual(['claude', 'cursor']);
    });

    it('calls process.exit for invalid tool', () => {
      parseTools('invalid-tool');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
