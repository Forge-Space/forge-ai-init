import type { DetectedStack } from '../../types.js';
import { detectStrategy, strategyDescription, strategyRationale } from './strategy.js';

export function generateInitialAdr(stack: DetectedStack): string {
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
