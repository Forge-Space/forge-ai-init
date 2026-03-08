import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import type { DetectedStack } from './types.js';
import { scanProject, type ScanReport } from './scanner.js';

export interface MigrationPlan {
  strategy: MigrationStrategy;
  boundaries: StranglerBoundary[];
  typingPlan: TypingStep[];
  dependencyRisks: DependencyRisk[];
  phases: MigrationPhase[];
  estimatedEffort: string;
}

export interface MigrationStrategy {
  name: string;
  description: string;
  applicableTo: string;
}

export interface StranglerBoundary {
  module: string;
  type: 'api' | 'service' | 'data' | 'ui';
  complexity: 'low' | 'medium' | 'high';
  reason: string;
  dependents: number;
}

export interface TypingStep {
  file: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedLines: number;
}

export interface DependencyRisk {
  name: string;
  currentVersion: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface MigrationPhase {
  name: string;
  description: string;
  tasks: string[];
  gate: string;
}

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

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', '.venv', 'target', 'vendor',
  '.turbo', '.cache', 'coverage',
]);

function detectStrategy(stack: DetectedStack): MigrationStrategy {
  if (stack.framework === 'express' || stack.framework === 'fastapi' ||
      stack.framework === 'django' || stack.framework === 'flask' ||
      stack.framework === 'nestjs' || stack.framework === 'spring') {
    return {
      name: 'Strangler Fig',
      description: 'Wrap legacy modules behind clean interfaces, build new alongside, redirect traffic incrementally, retire old code',
      applicableTo: `${stack.framework ?? stack.language} backend service`,
    };
  }
  if (stack.framework === 'nextjs' || stack.framework === 'react' ||
      stack.framework === 'vue' || stack.framework === 'svelte') {
    return {
      name: 'Branch by Abstraction',
      description: 'Abstract component boundaries, swap implementations behind stable interfaces, migrate page by page',
      applicableTo: `${stack.framework} frontend application`,
    };
  }
  if (stack.language === 'java') {
    return {
      name: 'Parallel Run',
      description: 'Run old and new systems simultaneously, compare outputs, switch traffic when parity confirmed',
      applicableTo: 'Java application',
    };
  }
  return {
    name: 'Incremental Modernization',
    description: 'Modernize module by module, starting with highest-risk areas, maintaining backward compatibility',
    applicableTo: `${stack.language} project`,
  };
}

function findStranglerBoundaries(
  dir: string,
  scan: ScanReport,
): StranglerBoundary[] {
  const boundaries: StranglerBoundary[] = [];
  const fileFindings = new Map<string, number>();

  for (const f of scan.findings) {
    const count = fileFindings.get(f.file) ?? 0;
    fileFindings.set(f.file, count + 1);
  }

  const godFiles = scan.findings
    .filter((f) => f.rule === 'god-file')
    .map((f) => f.file);

  const sprawlFiles = scan.findings
    .filter((f) => f.rule === 'function-sprawl')
    .map((f) => f.file);

  for (const file of godFiles) {
    const findings = fileFindings.get(file) ?? 0;
    boundaries.push({
      module: file,
      type: detectModuleType(file),
      complexity: findings > 5 ? 'high' : findings > 2 ? 'medium' : 'low',
      reason: 'God file — too many responsibilities, high coupling risk',
      dependents: findings,
    });
  }

  for (const file of sprawlFiles) {
    if (godFiles.includes(file)) continue;
    boundaries.push({
      module: file,
      type: detectModuleType(file),
      complexity: 'medium',
      reason: 'Function sprawl — too many exports, should be decomposed',
      dependents: fileFindings.get(file) ?? 0,
    });
  }

  return boundaries.sort((a, b) => b.dependents - a.dependents);
}

function detectModuleType(
  file: string,
): 'api' | 'service' | 'data' | 'ui' {
  const lower = file.toLowerCase();
  if (lower.includes('route') || lower.includes('controller') || lower.includes('api') || lower.includes('endpoint'))
    return 'api';
  if (lower.includes('model') || lower.includes('schema') || lower.includes('migration') || lower.includes('repo'))
    return 'data';
  if (lower.includes('component') || lower.includes('page') || lower.includes('view') || lower.includes('layout'))
    return 'ui';
  return 'service';
}

function analyzeTypingNeeds(dir: string): TypingStep[] {
  const steps: TypingStep[] = [];
  const jsFiles: { path: string; lines: number }[] = [];

  function walk(current: string) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(join(current, entry.name));
        }
      } else {
        const ext = extname(entry.name);
        if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
          const full = join(current, entry.name);
          try {
            const content = readFileSync(full, 'utf-8');
            const lines = content.split('\n').length;
            jsFiles.push({ path: relative(dir, full), lines });
          } catch { /* skip */ }
        }
      }
    }
  }

  walk(dir);

  if (jsFiles.length === 0) return [];

  const sorted = jsFiles.sort((a, b) => a.lines - b.lines);

  for (const file of sorted.slice(0, 20)) {
    const isEntry = /index\.[jm]?[jc]?sx?$|main\.[jm]?[jc]?sx?$/.test(file.path);
    const isConfig = /config|env|const/.test(file.path);
    const isUtil = /util|helper|lib/.test(file.path);

    let priority: 'high' | 'medium' | 'low' = 'medium';
    let reason = 'Standard module — convert to TypeScript';

    if (isEntry) {
      priority = 'high';
      reason = 'Entry point — types propagate to consumers';
    } else if (isUtil) {
      priority = 'high';
      reason = 'Utility module — shared across codebase, types prevent bugs';
    } else if (isConfig) {
      priority = 'medium';
      reason = 'Config file — type safety for environment variables';
    } else if (file.lines < 50) {
      priority = 'high';
      reason = 'Small file — quick win, low effort conversion';
    } else if (file.lines > 300) {
      priority = 'low';
      reason = 'Large file — convert after decomposition';
    }

    steps.push({
      file: file.path,
      priority,
      reason,
      estimatedLines: file.lines,
    });
  }

  return steps
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
}

function analyzeDependencyRisks(dir: string): DependencyRisk[] {
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

function buildPhases(
  scan: ScanReport,
  boundaries: StranglerBoundary[],
  typingSteps: TypingStep[],
  depRisks: DependencyRisk[],
): MigrationPhase[] {
  const phases: MigrationPhase[] = [];

  const criticalSecurity = scan.findings.filter(
    (f) => f.category === 'security' && f.severity === 'critical',
  );
  const criticalDeps = depRisks.filter((d) => d.severity === 'critical');

  phases.push({
    name: 'Phase 1: Stabilize',
    description: 'Fix critical issues, add safety net, establish CI',
    tasks: [
      ...(criticalSecurity.length > 0
        ? [`Fix ${criticalSecurity.length} critical security findings`]
        : []),
      ...(criticalDeps.length > 0
        ? [`Replace ${criticalDeps.length} deprecated dependencies`]
        : []),
      'Add characterization tests for core business logic',
      'Set up CI pipeline (lint + test + build)',
      'Save quality baseline: `forge-ai-init baseline`',
    ],
    gate: 'Score ≥ 40, zero critical findings',
  });

  if (boundaries.length > 0 || typingSteps.length > 0) {
    const tasks: string[] = [];
    if (boundaries.length > 0) {
      tasks.push(
        `Define interfaces for ${boundaries.length} boundary module(s)`,
      );
      for (const b of boundaries.slice(0, 3)) {
        tasks.push(`Decompose ${b.module} (${b.complexity} complexity)`);
      }
    }
    if (typingSteps.filter((s) => s.priority === 'high').length > 0) {
      const highPri = typingSteps.filter((s) => s.priority === 'high');
      tasks.push(
        `Convert ${highPri.length} high-priority files to TypeScript`,
      );
    }
    tasks.push('Enable strict type checking on new code');
    tasks.push('Add integration tests for migrated modules');

    phases.push({
      name: 'Phase 2: Modernize',
      description: 'Decompose modules, add types, modernize dependencies',
      tasks,
      gate: 'Score ≥ 60, type checking passes, test coverage > 50%',
    });
  }

  phases.push({
    name: `Phase ${phases.length + 1}: Harden`,
    description: 'Full governance, performance, production readiness',
    tasks: [
      'Enable full linting and formatting',
      'Achieve > 80% test coverage',
      'Address all high-severity findings',
      'Document architecture in ARCHITECTURE.md',
      'Add CLAUDE.md for AI governance',
      'Run `forge-ai-init gate --phase production`',
    ],
    gate: 'Score ≥ 80, gate passes in production phase',
  });

  return phases;
}

function estimateEffort(
  boundaries: StranglerBoundary[],
  typingSteps: TypingStep[],
  depRisks: DependencyRisk[],
  scan: ScanReport,
): string {
  let hours = 0;
  hours += boundaries.length * 8;
  hours += typingSteps.filter((s) => s.priority === 'high').length * 2;
  hours += typingSteps.filter((s) => s.priority === 'medium').length * 4;
  hours += depRisks.filter((d) => d.severity === 'critical').length * 4;
  hours += depRisks.filter((d) => d.severity === 'high').length * 2;
  hours += scan.findings.filter((f) => f.severity === 'critical').length * 2;

  if (hours === 0) hours = 4;

  if (hours <= 8) return '1-2 days';
  if (hours <= 24) return '3-5 days';
  if (hours <= 80) return '1-2 weeks';
  if (hours <= 160) return '2-4 weeks';
  return '1-2 months';
}

export function analyzeMigration(
  dir: string,
  stack: DetectedStack,
): MigrationPlan {
  const scan = scanProject(dir);
  const strategy = detectStrategy(stack);
  const boundaries = findStranglerBoundaries(dir, scan);
  const typingPlan = analyzeTypingNeeds(dir);
  const dependencyRisks = analyzeDependencyRisks(dir);
  const phases = buildPhases(scan, boundaries, typingPlan, dependencyRisks);
  const estimatedEffort = estimateEffort(
    boundaries,
    typingPlan,
    dependencyRisks,
    scan,
  );

  return {
    strategy,
    boundaries,
    typingPlan,
    dependencyRisks,
    phases,
    estimatedEffort,
  };
}
