import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Severity } from './scanner.js';
import type { FindingCategory } from './scanner.js';

export interface RuleOverride {
  disabled?: boolean;
  severity?: Severity;
}

export interface ForgeConfig {
  extends?: 'strict' | 'recommended' | 'lenient';
  rules?: Record<string, RuleOverride | false>;
  ignore?: string[];
  thresholds?: {
    commit?: number;
    pr?: number;
    deploy?: number;
  };
  categories?: Partial<Record<FindingCategory, {
    enabled?: boolean;
    weight?: number;
  }>>;
  maxFiles?: number;
}

const PRESETS: Record<string, Partial<ForgeConfig>> = {
  strict: {
    thresholds: { commit: 80, pr: 85, deploy: 90 },
  },
  recommended: {
    thresholds: { commit: 60, pr: 70, deploy: 80 },
  },
  lenient: {
    thresholds: { commit: 40, pr: 50, deploy: 60 },
    rules: {
      'console-log': false,
      'todo-marker': false,
      'type-assertion': false,
    },
  },
};

const CONFIG_FILES = [
  '.forgerc.json',
  '.forgerc',
  'forge.config.json',
];

export function loadConfig(dir: string): ForgeConfig {
  for (const name of CONFIG_FILES) {
    const filePath = join(dir, name);
    if (existsSync(filePath)) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as ForgeConfig;
        return resolveConfig(parsed);
      } catch {
        return {};
      }
    }
  }
  return {};
}

function resolveConfig(config: ForgeConfig): ForgeConfig {
  if (!config.extends) return config;

  const preset = PRESETS[config.extends];
  if (!preset) return config;

  const merged: ForgeConfig = {
    ...preset,
    ...config,
    rules: {
      ...(preset.rules ?? {}),
      ...(config.rules ?? {}),
    },
    thresholds: {
      ...(preset.thresholds ?? {}),
      ...(config.thresholds ?? {}),
    },
  };

  return merged;
}

export function isRuleDisabled(
  config: ForgeConfig,
  rule: string,
): boolean {
  const override = config.rules?.[rule];
  if (override === false) return true;
  if (typeof override === 'object' && override.disabled)
    return true;
  return false;
}

export function getRuleSeverity(
  config: ForgeConfig,
  rule: string,
  defaultSeverity: Severity,
): Severity {
  const override = config.rules?.[rule];
  if (!override || typeof override === 'boolean')
    return defaultSeverity;
  return override.severity ?? defaultSeverity;
}

export function isCategoryEnabled(
  config: ForgeConfig,
  category: FindingCategory,
): boolean {
  const catConfig = config.categories?.[category];
  if (!catConfig) return true;
  return catConfig.enabled !== false;
}

export function isFileIgnored(
  config: ForgeConfig,
  relPath: string,
): boolean {
  if (!config.ignore || config.ignore.length === 0)
    return false;

  for (const pattern of config.ignore) {
    if (relPath.startsWith(pattern)) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (relPath.startsWith(prefix)) return true;
    }
    if (relPath === pattern) return true;
  }
  return false;
}

export function getThreshold(
  config: ForgeConfig,
  gate: 'commit' | 'pr' | 'deploy',
): number | undefined {
  return config.thresholds?.[gate];
}
