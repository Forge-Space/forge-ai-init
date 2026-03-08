import type { DetectedStack, Tier } from '../types.js';

export type MigrationStrategy =
  | 'strangler-fig'
  | 'branch-by-abstraction'
  | 'parallel-run'
  | 'lift-and-shift';

interface MigrationPhase {
  name: string;
  threshold: number;
  focus: string[];
  tasks: string[];
}

function detectStrategy(stack: DetectedStack): MigrationStrategy {
  if (
    stack.framework === 'express' ||
    stack.framework === 'fastapi' ||
    stack.framework === 'django' ||
    stack.framework === 'flask'
  ) {
    return 'strangler-fig';
  }
  if (
    stack.framework === 'react' ||
    stack.framework === 'vue' ||
    stack.framework === 'nextjs'
  ) {
    return 'branch-by-abstraction';
  }
  if (stack.language === 'java') {
    return 'parallel-run';
  }
  return 'strangler-fig';
}

function strategyDescription(
  strategy: MigrationStrategy,
): string {
  switch (strategy) {
    case 'strangler-fig':
      return 'Wrap legacy system, build new modules alongside, redirect traffic incrementally, retire old code';
    case 'branch-by-abstraction':
      return 'Introduce abstraction layer over legacy code, implement new version behind abstraction, switch over';
    case 'parallel-run':
      return 'Run old and new systems simultaneously, compare outputs, switch when confident';
    case 'lift-and-shift':
      return 'Move to new infrastructure first, then modernize code incrementally';
  }
}

function migrationPhases(): MigrationPhase[] {
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

export function generateMigrationRoadmap(
  stack: DetectedStack,
): string {
  const strategy = detectStrategy(stack);
  const phases = migrationPhases();
  const lang = stack.language;
  const fw = stack.framework ?? lang;

  let content = `# Migration Roadmap

## Strategy: ${strategy.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}

${strategyDescription(strategy)}

## Detected Stack

- Language: ${lang}
- Framework: ${fw}
- Package Manager: ${stack.packageManager}
- Has Tests: ${stack.testFramework ? `Yes (${stack.testFramework})` : 'No'}
- Has Linting: ${stack.hasLinting ? 'Yes' : 'No'}
- Has Type Checking: ${stack.hasTypeChecking ? 'Yes' : 'No'}
- Has CI: ${stack.hasCi ? 'Yes' : 'No'}

## Phases

`;

  for (const phase of phases) {
    content += `### ${phase.name}\n\n`;
    if (phase.threshold > 0) {
      content += `**Quality Gate:** ${phase.threshold}% minimum score\n`;
      content += `**Focus:** ${phase.focus.join(', ')}\n\n`;
    }
    content += `**Tasks:**\n`;
    for (const task of phase.tasks) {
      content += `- [ ] ${task}\n`;
    }
    content += '\n';
  }

  content += `## Key Commands

\`\`\`bash
# Assess current state
npx forge-ai-init check
npx forge-ai-init migrate

# Add governance layer
npx forge-ai-init --migrate --tier standard --yes

# Run quality gate check
npx forge-ai-init check
\`\`\`

## ADR Template

Create \`docs/adr/ADR-NNNN-title.md\` for each migration decision:

\`\`\`markdown
# ADR-NNNN: [Decision Title]

## Status: [Proposed | Accepted | Deprecated]

## Context
[Why this decision is needed]

## Decision
[What was decided]

## Consequences
[What changes as a result]
\`\`\`
`;

  return content;
}

export interface MigrationFile {
  path: string;
  content: string;
}

export function generateMigrationFiles(
  stack: DetectedStack,
  _tier: Tier,
): MigrationFile[] {
  const files: MigrationFile[] = [];

  files.push({
    path: 'MIGRATION.md',
    content: generateMigrationRoadmap(stack),
  });

  files.push({
    path: 'docs/adr/ADR-0001-migration-strategy.md',
    content: generateInitialAdr(stack),
  });

  return files;
}

function generateInitialAdr(stack: DetectedStack): string {
  const strategy = detectStrategy(stack);

  return `# ADR-0001: Migration Strategy Selection

## Status: Proposed

## Context

This project requires modernization. After running governance audit (\`npx forge-ai-init check\`) and code scan (\`npx forge-ai-init migrate\`), the following was identified:

- Language: ${stack.language}
- Framework: ${stack.framework ?? 'none detected'}
- Type checking: ${stack.hasTypeChecking ? 'enabled' : 'not enabled'}
- Test framework: ${stack.testFramework ?? 'none detected'}
- CI/CD: ${stack.hasCi ? 'configured' : 'not configured'}

## Decision

Use **${strategy.replace(/-/g, ' ')}** strategy.

${strategyDescription(strategy)}

## Rationale

${strategyRationale(strategy, stack)}

## Consequences

- Migration will proceed in 4 phases with progressive quality gates (40% → 60% → 80%)
- Each module requires characterization tests before migration
- Architecture decisions must be documented in ADRs
- Feature flags will control traffic between old and new code paths
`;
}

function strategyRationale(
  strategy: MigrationStrategy,
  stack: DetectedStack,
): string {
  switch (strategy) {
    case 'strangler-fig':
      return `The ${stack.framework ?? stack.language} backend can be incrementally replaced by routing traffic at the API layer. New modules are built alongside existing ones, traffic is gradually shifted, and old code is retired when the new module proves stable.`;
    case 'branch-by-abstraction':
      return `The ${stack.framework ?? stack.language} frontend can be migrated by introducing component-level abstractions. Legacy components are wrapped in adapter interfaces, new implementations are built behind the same interface, and the switch happens at the component boundary.`;
    case 'parallel-run':
      return `The ${stack.language} application benefits from running old and new systems simultaneously. Both receive the same inputs, outputs are compared for correctness, and the new system takes over when confidence is established.`;
    case 'lift-and-shift':
      return `Moving the ${stack.language} application to modern infrastructure first (containerization, CI/CD, monitoring) provides immediate operational benefits while code modernization continues incrementally.`;
  }
}
