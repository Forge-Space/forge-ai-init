import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult } from '../checker.js';

function fileExists(dir: string, ...paths: string[]): boolean {
  return existsSync(join(dir, ...paths));
}

function dirHasFiles(dir: string, ...paths: string[]): boolean {
  const full = join(dir, ...paths);
  if (!existsSync(full)) return false;
  try {
    return readdirSync(full).length > 0;
  } catch {
    return false;
  }
}

export function checkPolicies(dir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const hasPolicies = dirHasFiles(dir, '.forge', 'policies');

  results.push({
    name: 'Policy engine',
    status: hasPolicies ? 'pass' : 'warn',
    detail: hasPolicies
      ? 'Enterprise policies configured'
      : 'No .forge/policies/ — no automated policy enforcement',
    category: 'policies',
    weight: 1,
  });

  if (hasPolicies) {
    const policyDir = join(dir, '.forge', 'policies');
    try {
      const files = readdirSync(policyDir);
      const policyTypes = ['security', 'quality', 'compliance'];
      const found = policyTypes.filter((t) => files.some((f) => f.includes(t)));
      results.push({
        name: 'Policy coverage',
        status: found.length >= 3 ? 'pass' : found.length >= 1 ? 'warn' : 'fail',
        detail: `${found.length} of ${policyTypes.length} core policies (${found.join(', ') || 'none'})`,
        category: 'policies',
        weight: 1,
      });
    } catch {
      // ignore
    }
  }

  const hasScorecard = fileExists(dir, '.forge', 'scorecard.json');
  results.push({
    name: 'Scorecard',
    status: hasScorecard ? 'pass' : 'warn',
    detail: hasScorecard
      ? 'Scorecard configuration found'
      : 'No scorecard — no automated project scoring',
    category: 'policies',
    weight: 1,
  });

  return results;
}
