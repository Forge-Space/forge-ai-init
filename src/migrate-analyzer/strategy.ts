import type { DetectedStack } from '../types.js';
import type { MigrationStrategy } from './types.js';

export function detectStrategy(stack: DetectedStack): MigrationStrategy {
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
