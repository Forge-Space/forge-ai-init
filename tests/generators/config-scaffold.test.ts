import { generateConfigFile } from '../../src/generators/config-scaffold.js';

describe('generateConfigFile', () => {
  it('generates valid JSON for all tiers', () => {
    for (const tier of ['lite', 'standard', 'enterprise'] as const) {
      const content = generateConfigFile(tier);
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  it('lite tier uses lenient preset', () => {
    const config = JSON.parse(generateConfigFile('lite'));
    expect(config.extends).toBe('lenient');
    expect(config.thresholds).toBeUndefined();
  });

  it('standard tier uses recommended preset with thresholds', () => {
    const config = JSON.parse(generateConfigFile('standard'));
    expect(config.extends).toBe('recommended');
    expect(config.thresholds).toEqual({
      commit: 60,
      pr: 70,
      deploy: 80,
    });
  });

  it('enterprise tier uses strict preset with higher thresholds', () => {
    const config = JSON.parse(generateConfigFile('enterprise'));
    expect(config.extends).toBe('strict');
    expect(config.thresholds).toEqual({
      commit: 75,
      pr: 80,
      deploy: 90,
    });
  });

  it('includes common fields for all tiers', () => {
    for (const tier of ['lite', 'standard', 'enterprise'] as const) {
      const config = JSON.parse(generateConfigFile(tier));
      expect(config.rules).toEqual({});
      expect(config.ignore).toEqual(['dist/', 'coverage/', '*.generated.*']);
      expect(config.maxFiles).toBe(500);
    }
  });

  it('ends with newline', () => {
    const content = generateConfigFile('standard');
    expect(content.endsWith('\n')).toBe(true);
  });
});
