import type { DetectedStack } from '../../types.js';

export function testFirstSkill(stack: DetectedStack): string {
  const testCmd = stack.testCommand ?? 'npm test';

  return `---
name: test-first
description: Enforce test-driven development and coverage thresholds
---

# Test-First Development

Enforce TDD practices and maintain test coverage.

## When to Use

- Before implementing any new feature
- When fixing bugs (regression test first)
- When coverage drops below threshold

## Rules

1. **Test before code**: Write the test, see it fail, then implement
2. **Regression tests**: Every bug fix must include a test that reproduces the bug
3. **Coverage threshold**: Maintain >80% line coverage
4. **No test skipping**: \`.skip\` and \`.only\` must not be committed

## Process

1. Write failing test for the expected behavior
2. Run \`${testCmd}\` — confirm it fails
3. Implement the minimum code to pass
4. Run \`${testCmd}\` — confirm it passes
5. Refactor if needed, keeping tests green

## What to Test

- Business logic and domain rules
- User-facing behavior and edge cases
- Error conditions and validation
- Integration points (API calls, database queries)

## What NOT to Test

- Trivial getters/setters
- Framework internals
- Third-party library behavior
- Implementation details (private methods)
`;
}
