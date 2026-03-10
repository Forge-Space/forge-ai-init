import type { DetectedStack, Tier } from '../types.js';

export interface HookFile {
  path: string;
  content: string;
}

function preCommitHook(_stack: DetectedStack): string {
  return `#!/usr/bin/env sh
set -e

npx forge-ai-init test-autogen --staged --write --check \\
  --tenant "\${FORGE_TENANT_ID:?FORGE_TENANT_ID is required}" \\
  --tenant-profile-ref "\${FORGE_TENANT_PROFILE_REF:?FORGE_TENANT_PROFILE_REF is required}"
`;
}

function prePushHook(_stack: DetectedStack): string {
  return `#!/usr/bin/env sh
set -e

npx forge-ai-init test-autogen --check --json \\
  --tenant "\${FORGE_TENANT_ID:?FORGE_TENANT_ID is required}" \\
  --tenant-profile-ref "\${FORGE_TENANT_PROFILE_REF:?FORGE_TENANT_PROFILE_REF is required}" >/dev/null
`;
}

function installScript(): string {
  return `#!/usr/bin/env sh
set -e

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push

echo "Forge hooks installed at .githooks"
`;
}

export function generateGitHooks(
  stack: DetectedStack,
  tier: Tier,
): HookFile[] {
  if (tier === 'lite') return [];

  return [
    {
      path: '.githooks/pre-commit',
      content: preCommitHook(stack),
    },
    {
      path: '.githooks/pre-push',
      content: prePushHook(stack),
    },
    {
      path: 'scripts/hooks/install-hooks.sh',
      content: installScript(),
    },
  ];
}
