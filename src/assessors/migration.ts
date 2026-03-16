import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedStack } from '../types.js';
import { readJson } from '../shared.js';
import type { AssessmentFinding } from './types.js';

export function collectMigrationReadiness(
  dir: string,
  stack: DetectedStack,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];

  const legacyStacks: Record<string, string> = {
    jquery: 'jQuery -> React/Vue/Svelte',
    backbone: 'Backbone -> React/Vue',
    angular: 'AngularJS 1.x -> Angular 17+ or React',
    ember: 'Ember -> Next.js/Nuxt',
    knockout: 'Knockout -> React/Vue',
  };

  const pkgPath = join(dir, 'package.json');
  const pkg = readJson(pkgPath);
  const allDeps = pkg
    ? {
        ...((pkg['dependencies'] ?? {}) as Record<string, string>),
        ...((pkg['devDependencies'] ?? {}) as Record<string, string>),
      }
    : {};

  for (const [dep, migration] of Object.entries(legacyStacks)) {
    if (allDeps[dep]) {
      findings.push({
        category: 'migration-readiness',
        severity: 'high',
        title: `Legacy stack: ${dep}`,
        detail: `Migration path: ${migration}`,
      });
    }
  }

  if (stack.language === 'javascript' && !stack.hasTypeChecking) {
    findings.push({
      category: 'migration-readiness',
      severity: 'medium',
      title: 'JavaScript without TypeScript',
      detail: 'Adopt TypeScript before migration',
    });
  }

  if (!stack.testFramework) {
    findings.push({
      category: 'migration-readiness',
      severity: 'critical',
      title: 'No tests — migration unsafe',
      detail: 'Characterization tests required first',
    });
  }

  if (!stack.hasCi) {
    findings.push({
      category: 'migration-readiness',
      severity: 'high',
      title: 'No CI — migration unverifiable',
      detail: 'CI pipeline needed to validate migration',
    });
  }

  const hasDoc =
    existsSync(join(dir, 'README.md')) ||
    existsSync(join(dir, 'ARCHITECTURE.md'));
  if (!hasDoc) {
    findings.push({
      category: 'migration-readiness',
      severity: 'medium',
      title: 'No documentation',
      detail: 'No README or arch docs — team lacks context',
    });
  }

  let globalStateCount = 0;
  for (const file of files.slice(0, 200)) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const globals = (
      content.match(
        /(?:window\.\w+\s*=|global\.\w+\s*=|globalThis\.\w+\s*=)/g,
      ) ?? []
    ).length;
    globalStateCount += globals;
  }

  if (globalStateCount > 5) {
    findings.push({
      category: 'migration-readiness',
      severity: 'high',
      title: 'Global state pollution',
      detail: `${globalStateCount} global assignments — refactor first`,
    });
  } else if (globalStateCount > 0) {
    findings.push({
      category: 'migration-readiness',
      severity: 'medium',
      title: 'Global state usage',
      detail: `${globalStateCount} global assignments`,
    });
  }

  return findings;
}
