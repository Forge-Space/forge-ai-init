import type { DetectedStack } from '../../types.js';
import type { MigrationStrategy } from './types.js';

export function detectStrategy(stack: DetectedStack): MigrationStrategy {
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

export function strategyDescription(strategy: MigrationStrategy): string {
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

export function strategyRationale(
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
