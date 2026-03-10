import type { DetectedStack } from '../../types.js';

export function testAutogenSkill(stack: DetectedStack): string {
  const runCheck = 'npx forge-ai-init test-autogen --staged --write --check';
  const runCiCheck = 'npx forge-ai-init test-autogen --check --json';
  const testCmd = stack.testCommand ?? 'npm test';

  return `---
name: test-autogen
description: Auto-generate required unit and integration tests for changed code and enforce E2E for critical flows
---

# Test Autogen

Generate missing tests by default during commit flow and enforce required test coverage per changed file.

## Default Trigger

- Run automatically on commit via \`.claude/settings.json\` hooks
- Validate in CI via \`forge-ai-action\` with \`test-autogen-check\`

## Commands

- Local commit guard: \`${runCheck}\`
- CI/PR parity: \`${runCiCheck}\`
- Execute full suite after generation: \`${testCmd}\`

## Coverage Rules

1. Always require unit tests for changed production files
2. Require integration tests for boundary changes (API, DB, services)
3. Require E2E for critical flows and UI+API combined changes

## Bypass Policy

Temporary bypass is allowed only with all env vars set:

- \`FORGE_TEST_AUTOGEN_BYPASS=1\`
- \`FORGE_BYPASS_REASON=<ticket-or-incident>\`
- \`FORGE_BYPASS_EXPIRES_AT=<ISO timestamp>\`

Bypass events are audited in \`.forge/test-autogen-audit.jsonl\`.
`;
}
