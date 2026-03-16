import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DependencyRisk } from './types.js';

const LEGACY_DEPS: Record<string, { replacement: string; severity: 'critical' | 'high' | 'medium' }> = {
  'moment': { replacement: 'date-fns or dayjs', severity: 'high' },
  'jquery': { replacement: 'native DOM APIs or framework', severity: 'high' },
  'lodash': { replacement: 'native ES2022+ or lodash-es', severity: 'medium' },
  'underscore': { replacement: 'native ES2022+ methods', severity: 'medium' },
  'request': { replacement: 'fetch or undici', severity: 'critical' },
  'express': { replacement: 'Express 5 or Fastify', severity: 'medium' },
  'left-pad': { replacement: 'String.prototype.padStart', severity: 'medium' },
  'bluebird': { replacement: 'native Promise', severity: 'medium' },
  'async': { replacement: 'async/await', severity: 'medium' },
  'chalk': { replacement: 'picocolors (smaller)', severity: 'low' as 'medium' },
  'commander': { replacement: '@clack/prompts for CLI', severity: 'low' as 'medium' },
};

export function analyzeDependencyRisks(dir: string): DependencyRisk[] {
  const risks: DependencyRisk[] = [];
  const pkgPath = join(dir, 'package.json');

  if (!existsSync(pkgPath)) return [];

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return [];
  }

  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  for (const [name, version] of Object.entries(allDeps)) {
    const legacy = LEGACY_DEPS[name];
    if (legacy) {
      risks.push({
        name,
        currentVersion: String(version),
        issue: `Legacy dependency — ${name} is outdated or has better alternatives`,
        severity: legacy.severity,
        recommendation: `Replace with ${legacy.replacement}`,
      });
    }
  }

  const depCount = Object.keys(pkg.dependencies ?? {}).length;
  if (depCount > 30) {
    risks.push({
      name: '(dependency count)',
      currentVersion: String(depCount),
      issue: `${depCount} production dependencies — high supply chain risk`,
      severity: depCount > 50 ? 'high' : 'medium',
      recommendation: 'Audit and remove unused deps, prefer native APIs',
    });
  }

  return risks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}
