import type { DetectedStack } from '../../types.js';

export function scorecardWorkflow(stack: DetectedStack): string {
  const setup =
    stack.language === 'python'
      ? `      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt`
      : `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: ${stack.packageManager === 'pnpm' ? 'pnpm' : stack.packageManager === 'yarn' ? 'yarn' : 'npm'}
      - run: ${stack.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : stack.packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : 'npm ci'}`;

  return `name: Scorecard

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  scorecard:
    name: Project Scorecard
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

${setup}

      - name: Run scorecard
        continue-on-error: true
        run: npx forge-scorecard --project-dir . --threshold 60
`;
}

export function policyCheckWorkflow(_stack: DetectedStack): string {
  return `name: Policy Check

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  policy-check:
    name: Policy Evaluation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Run policy check
        continue-on-error: true
        run: npx forge-policy --policy-dir .forge/policies --fail-on-block
`;
}

export function migrationGateWorkflow(_stack: DetectedStack): string {
  return `name: Migration Quality Gate

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  migration-gate:
    name: Progressive Migration Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Governance audit
        run: npx forge-ai-init check

      - name: Migration policy check
        continue-on-error: true
        run: npx forge-policy --policy-dir .forge/policies --policy migration-progressive --fail-on-block
`;
}
