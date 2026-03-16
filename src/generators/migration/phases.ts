import type { MigrationPhase } from './types.js';

export function migrationPhases(): MigrationPhase[] {
  return [
    {
      name: 'Assessment',
      threshold: 0,
      focus: ['inventory', 'risk-analysis'],
      tasks: [
        'Run `npx forge-ai-init check` to baseline governance score',
        'Run `npx forge-ai-init migrate` to scan for anti-patterns',
        'Identify critical modules by business value + change frequency',
        'Document current architecture in ADR-0001',
        'Create dependency inventory (outdated, vulnerable, EOL)',
      ],
    },
    {
      name: 'Foundation (40% quality gate)',
      threshold: 40,
      focus: ['security', 'testing'],
      tasks: [
        'Fix critical security vulnerabilities',
        'Add characterization tests for top 5 modules',
        'Set up CI pipeline with lint + test + audit',
        'Add .env protection and secret scanning',
        'Enable type checking on new files',
      ],
    },
    {
      name: 'Stabilization (60% quality gate)',
      threshold: 60,
      focus: ['quality', 'architecture'],
      tasks: [
        'Enable linting and formatting across codebase',
        'Add type annotations to modified files',
        'Increase test coverage to 50%+',
        'Extract shared utilities from duplicated code',
        'Document migration decisions in ADRs',
      ],
    },
    {
      name: 'Production (80% quality gate)',
      threshold: 80,
      focus: ['performance', 'reliability'],
      tasks: [
        'Achieve 80%+ test coverage on migrated modules',
        'Add performance monitoring and alerting',
        'Complete dependency modernization',
        'Remove deprecated APIs and dead code',
        'Run full governance audit — target A/B grade',
      ],
    },
  ];
}
