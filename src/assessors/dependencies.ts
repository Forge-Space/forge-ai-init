import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedStack } from '../types.js';
import { readJson } from '../shared.js';
import type { AssessmentFinding, Severity } from './types.js';

export function collectDependencyFindings(
  dir: string,
  stack: DetectedStack,
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];
  const pkgPath = join(dir, 'package.json');
  const pkg = readJson(pkgPath);

  if (!pkg) {
    if (
      stack.language === 'javascript' ||
      stack.language === 'typescript'
    ) {
      findings.push({
        category: 'dependencies',
        severity: 'high',
        title: 'Missing package.json',
        detail: 'No package.json found in project root',
      });
    }
    return findings;
  }

  const deps = {
    ...((pkg['dependencies'] ?? {}) as Record<string, string>),
  };
  const devDeps = {
    ...((pkg['devDependencies'] ?? {}) as Record<string, string>),
  };
  const allDeps = { ...deps, ...devDeps };
  const depCount = Object.keys(deps).length;
  const devDepCount = Object.keys(devDeps).length;

  if (depCount > 50) {
    findings.push({
      category: 'dependencies',
      severity: 'high',
      title: 'Excessive dependencies',
      detail: `${depCount} production deps — high attack surface`,
    });
  } else if (depCount > 30) {
    findings.push({
      category: 'dependencies',
      severity: 'medium',
      title: 'Many dependencies',
      detail: `${depCount} production deps — review for unused`,
    });
  }

  const legacyPkgs: Record<string, string> = {
    jquery: 'jQuery — migrate to modern framework',
    backbone: 'Backbone.js — EOL, migrate to React/Vue',
    angular: 'AngularJS 1.x — EOL, migrate to Angular 2+',
    grunt: 'Grunt — migrate to Vite/esbuild',
    gulp: 'Gulp — migrate to npm scripts',
    bower: 'Bower — deprecated, use npm',
    coffeescript: 'CoffeeScript — migrate to TypeScript',
    moment: 'Moment.js — deprecated, use date-fns',
    request: 'Request — deprecated, use fetch/undici',
  };

  for (const [name, msg] of Object.entries(legacyPkgs)) {
    if (allDeps[name]) {
      const severity: Severity = [
        'angular',
        'backbone',
        'coffeescript',
        'bower',
      ].includes(name)
        ? 'high'
        : 'medium';
      findings.push({
        category: 'dependencies',
        severity,
        title: `Legacy dependency: ${name}`,
        detail: msg,
      });
    }
  }

  const hasLockfile =
    existsSync(join(dir, 'package-lock.json')) ||
    existsSync(join(dir, 'yarn.lock')) ||
    existsSync(join(dir, 'pnpm-lock.yaml')) ||
    existsSync(join(dir, 'bun.lockb'));

  if (!hasLockfile) {
    findings.push({
      category: 'dependencies',
      severity: 'high',
      title: 'No lockfile',
      detail: 'No lockfile — builds are not reproducible',
    });
  }

  const engines = pkg['engines'] as Record<string, string> | undefined;
  if (!engines?.['node']) {
    findings.push({
      category: 'dependencies',
      severity: 'medium',
      title: 'No Node.js engine constraint',
      detail: 'No engines.node — runtime version not pinned',
    });
  }

  if (devDepCount === 0 && depCount > 0) {
    findings.push({
      category: 'dependencies',
      severity: 'medium',
      title: 'No devDependencies',
      detail: 'All deps are production — likely missing dev tools',
    });
  }

  return findings;
}
