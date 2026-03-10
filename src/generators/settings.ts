import type { DetectedStack, Tier } from '../types.js';

interface Hook {
  matcher: string;
  hooks: Array<{
    type: 'command' | 'prompt';
    command?: string;
    prompt?: string;
    timeout?: number;
  }>;
}

function safetyHooks(): Hook[] {
  return [
    {
      matcher: 'Bash(rm -rf|sudo rm|rm -r)',
      hooks: [
        {
          type: 'prompt',
          prompt:
            'DANGER: This command will permanently delete files. Check the paths carefully.',
          timeout: 10,
        },
      ],
    },
    {
      matcher: 'Bash(git push.*main|git push.*master)',
      hooks: [
        {
          type: 'command',
          command:
            "echo 'BLOCK: Do not push directly to main — use a feature branch and PR'; exit 1",
        },
      ],
    },
  ];
}

function formattingHooks(stack: DetectedStack): Hook[] {
  if (!stack.hasFormatting) return [];

  const formatCmd =
    stack.language === 'python'
      ? 'ruff format "$FILEPATH" 2>/dev/null || true'
      : 'npx prettier --write "$FILEPATH" 2>/dev/null || true';

  return [
    {
      matcher: 'Edit|Write',
      hooks: [
        {
          type: 'command',
          command: formatCmd,
        },
      ],
    },
  ];
}

function gitWorkflowHooks(): Hook[] {
  return [
    {
      matcher: 'Bash(git push)',
      hooks: [
        {
          type: 'prompt',
          prompt:
            'CONFIRM: Pushing to remote. Was this requested?',
          timeout: 10,
        },
      ],
    },
    {
      matcher: 'Bash(gh pr create)',
      hooks: [
        {
          type: 'prompt',
          prompt:
            'CONFIRM: Creating a pull request. Was this requested?',
          timeout: 10,
        },
      ],
    },
  ];
}

function preCommitHooks(tier: Tier): Hook[] {
  if (tier === 'lite') return [];

  const threshold = tier === 'enterprise' ? 75 : 60;
  const qualityGateCmd = `npx forge-ai-init migrate --json 2>/dev/null | node -e "const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));if(r.score<${threshold}){console.error('BLOCK: Quality score '+r.score+'/${threshold}. Fix findings before committing.');process.exit(1)}else{console.log('Quality gate passed: '+r.score+'/100 ('+r.grade+')')}"`;
  const testAutogenCmd =
    'npx forge-ai-init test-autogen --staged --write --check';

  return [
    {
      matcher: 'Bash(git commit)',
      hooks: [
        {
          type: 'command',
          command: `${testAutogenCmd} && ${qualityGateCmd}`,
        },
      ],
    },
  ];
}

function secretProtectionHooks(): Hook[] {
  return [
    {
      matcher: 'Edit|Write',
      hooks: [
        {
          type: 'command',
          command: `case "$FILEPATH" in *.env|*.env.*|*credentials*|*secret*) [[ "$FILEPATH" == *.example ]] && exit 0; echo 'BLOCK: Protected file — do not edit secrets directly'; exit 1;; *package-lock.json|*yarn.lock|*pnpm-lock.yaml) echo 'BLOCK: Do not edit lockfiles directly'; exit 1;; esac; exit 0`,
        },
      ],
    },
  ];
}

export function generateSettings(
  stack: DetectedStack,
  tier: Tier,
): object {
  const preToolUse: Hook[] = [];
  const postToolUse: Hook[] = [];

  preToolUse.push(...safetyHooks());
  preToolUse.push(...secretProtectionHooks());
  postToolUse.push(...formattingHooks(stack));

  if (tier !== 'lite') {
    preToolUse.push(...gitWorkflowHooks());
    preToolUse.push(...preCommitHooks(tier));
  }

  return {
    hooks: {
      PreToolUse: preToolUse,
      PostToolUse: postToolUse,
    },
  };
}
