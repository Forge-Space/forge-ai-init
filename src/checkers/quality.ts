import type { DetectedStack } from '../types.js';
import type { CheckResult } from '../checker.js';

export function checkQuality(dir: string, stack: DetectedStack): CheckResult[] {
  const results: CheckResult[] = [];

  results.push({
    name: 'Linting',
    status: stack.hasLinting ? 'pass' : 'fail',
    detail: stack.hasLinting
      ? `Linter configured${stack.lintCommand ? ` (${stack.lintCommand})` : ''}`
      : 'No linter — code style issues go uncaught',
    category: 'quality',
    weight: 2,
  });

  results.push({
    name: 'Type checking',
    status: stack.hasTypeChecking ? 'pass' : 'fail',
    detail: stack.hasTypeChecking
      ? 'Type checking enabled'
      : 'No type checking — type errors reach production',
    category: 'quality',
    weight: 3,
  });

  results.push({
    name: 'Formatting',
    status: stack.hasFormatting ? 'pass' : 'warn',
    detail: stack.hasFormatting
      ? 'Code formatter configured'
      : 'No formatter — inconsistent code style across contributors',
    category: 'quality',
    weight: 1,
  });

  const hasTests = !!stack.testFramework;
  results.push({
    name: 'Test framework',
    status: hasTests ? 'pass' : 'fail',
    detail: hasTests
      ? `Test framework detected (${stack.testFramework})`
      : 'No test framework — code ships without automated tests',
    category: 'quality',
    weight: 3,
  });

  return results;
}
