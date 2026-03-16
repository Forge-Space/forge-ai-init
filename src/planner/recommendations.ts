import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedStack } from '../types.js';
import type { ScanReport } from '../scanner.js';
import type { ArchRecommendation, AdrSuggestion, ProjectStructure } from './types.js';

export function generateRecommendations(
  stack: DetectedStack,
  scan: ScanReport,
  structure: ProjectStructure,
): ArchRecommendation[] {
  const recs: ArchRecommendation[] = [];

  if (structure.testRatio < 50) {
    recs.push({
      category: 'testing',
      title: 'Increase test coverage',
      description: `${structure.testRatio}% test ratio — target 80%+ for safe refactoring`,
      priority: 'must',
    });
  }

  if (!stack.hasFormatting) {
    recs.push({
      category: 'consistency',
      title: 'Add code formatter',
      description: 'Prettier/Black/gofmt eliminates style debates',
      priority: 'should',
    });
  }

  if (stack.monorepo && !existsSync(join('turbo.json'))) {
    recs.push({
      category: 'build',
      title: 'Add build orchestration',
      description: 'Turborepo or Nx for monorepo build caching and task ordering',
      priority: 'should',
    });
  }

  if (scan.findings.filter((f) => f.severity === 'critical').length > 0) {
    recs.push({
      category: 'security',
      title: 'Fix critical security findings immediately',
      description: 'Hardcoded secrets, SQL injection, and other critical issues',
      priority: 'must',
    });
  }

  recs.push({
    category: 'documentation',
    title: 'Create ARCHITECTURE.md',
    description: 'Document layers, data flow, key decisions — prevents knowledge silos',
    priority: 'should',
  });

  recs.push({
    category: 'governance',
    title: 'Define quality gates per phase',
    description: 'Phase 1: 40% (critical only), Phase 2: 60% (+ lint), Phase 3: 80% (full)',
    priority: 'must',
  });

  return recs;
}

export function suggestAdrs(
  stack: DetectedStack,
  _structure: ProjectStructure,
): AdrSuggestion[] {
  const adrs: AdrSuggestion[] = [];

  adrs.push({
    title: 'ADR-001: Architecture Style',
    context: `${stack.language} project${stack.framework ? ` using ${stack.framework}` : ''}`,
    decision: stack.framework
      ? `Use ${stack.framework} conventions with layered architecture`
      : 'Use modular architecture with clear dependency boundaries',
  });

  if (stack.monorepo) {
    adrs.push({
      title: 'ADR-002: Monorepo Strategy',
      context: 'Multiple packages need coordinated builds and releases',
      decision: 'Turborepo for build orchestration with workspace dependencies',
    });
  }

  adrs.push({
    title: `ADR-00${stack.monorepo ? 3 : 2}: Testing Strategy`,
    context: 'Need reliable test coverage for safe iteration',
    decision: `${stack.testFramework ?? 'Jest'} for unit tests, Playwright for E2E, >80% coverage target`,
  });

  return adrs;
}
