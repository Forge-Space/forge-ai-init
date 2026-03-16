import type { ScanReport } from '../scanner.js';
import type { StranglerBoundary, TypingStep, DependencyRisk, MigrationPhase } from './types.js';

export function buildPhases(
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

export function estimateEffort(
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
