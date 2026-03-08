import type { Tier } from '../types.js';

export function generateConfigFile(tier: Tier): string {
  const config: Record<string, unknown> = {
    extends: tier === 'enterprise'
      ? 'strict'
      : tier === 'standard'
        ? 'recommended'
        : 'lenient',
  };

  if (tier === 'enterprise') {
    config.thresholds = {
      commit: 75,
      pr: 80,
      deploy: 90,
    };
  } else if (tier === 'standard') {
    config.thresholds = {
      commit: 60,
      pr: 70,
      deploy: 80,
    };
  }

  config.rules = {};
  config.ignore = [
    'dist/',
    'coverage/',
    '*.generated.*',
  ];
  config.maxFiles = 500;

  return JSON.stringify(config, null, 2) + '\n';
}
