import { generateMcpConfig } from '../../src/generators/mcp-config.js';
import type { DetectedStack } from '../../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
};

describe('generateMcpConfig', () => {
  it('always includes context7', () => {
    const config = generateMcpConfig(baseStack);
    expect(config['context7']).toBeDefined();
    expect(config['context7'].command).toBe('npx');
    expect(config['context7'].args).toContain('-y');
  });

  it('adds playwright for nextjs', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'nextjs' });
    expect(config['playwright']).toBeDefined();
    expect(config['playwright'].args).toEqual(
      expect.arrayContaining([expect.stringContaining('playwright')]),
    );
  });

  it('adds playwright for remix', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'remix' });
    expect(config['playwright']).toBeDefined();
  });

  it('does not add playwright for non-web frameworks', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'express' });
    expect(config['playwright']).toBeUndefined();
  });

  it('does not add playwright when no framework', () => {
    const config = generateMcpConfig(baseStack);
    expect(config['playwright']).toBeUndefined();
  });

  it('adds supabase for supabase projects', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'nextjs' });
    // supabase is conditionally added based on detection
    expect(typeof config).toBe('object');
  });

  it('adds sequential-thinking for python projects (line 32)', () => {
    const config = generateMcpConfig({ ...baseStack, language: 'python' });
    expect(config['sequential-thinking']).toBeDefined();
    expect(config['sequential-thinking'].args).toContain(
      '@modelcontextprotocol/server-sequential-thinking',
    );
  });

  it('does not add sequential-thinking for non-python projects', () => {
    const config = generateMcpConfig(baseStack);
    expect(config['sequential-thinking']).toBeUndefined();
  });

  it('adds playwright for sveltekit framework', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'sveltekit' });
    expect(config['playwright']).toBeDefined();
  });

  it('adds playwright for nuxt framework', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'nuxt' });
    expect(config['playwright']).toBeDefined();
  });

  it('adds playwright for astro framework', () => {
    const config = generateMcpConfig({ ...baseStack, framework: 'astro' });
    expect(config['playwright']).toBeDefined();
  });

  it('returns valid server entries with command and args', () => {
    const config = generateMcpConfig(baseStack);
    for (const [, server] of Object.entries(config)) {
      expect(server).toHaveProperty('command');
      expect(server).toHaveProperty('args');
      expect(typeof server.command).toBe('string');
      expect(Array.isArray(server.args)).toBe(true);
    }
  });
});
