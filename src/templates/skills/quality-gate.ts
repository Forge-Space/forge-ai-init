import type { DetectedStack } from '../../types.js';

export function qualityGateSkill(stack: DetectedStack): string {
  const checks: string[] = [];

  if (stack.lintCommand) checks.push(`1. **Lint**: \`${stack.lintCommand}\``);
  if (stack.hasTypeChecking) {
    const cmd =
      stack.language === 'python'
        ? 'mypy .'
        : 'npx tsc --noEmit';
    checks.push(`2. **Type Check**: \`${cmd}\``);
  }
  if (stack.buildCommand)
    checks.push(`3. **Build**: \`${stack.buildCommand}\``);
  if (stack.testCommand)
    checks.push(`4. **Tests**: \`${stack.testCommand}\``);
  checks.push(
    `5. **Security Audit**: \`${stack.language === 'python' ? 'pip audit' : 'npm audit --audit-level=high'}\``,
  );

  return `---
name: quality-gate
description: Run all quality checks before creating a PR
---

# Quality Gate

Run this before every PR to ensure code meets quality standards.

## When to Use

- Before creating a pull request
- After completing a feature or bug fix
- Before merging to main

## Checks

${checks.join('\n')}

## Process

1. Run all checks in sequence
2. If any check fails, fix the issue before proceeding
3. Report results summary

## Failure Handling

- Lint failures: auto-fix with \`--fix\` flag, then re-check
- Type errors: must be fixed manually — no suppressions
- Test failures: investigate and fix — no skipping tests
- Security: high/critical vulnerabilities must be resolved
`;
}
