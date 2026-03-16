import type { DetectedStack } from '../../types.js';

export function githubCiWorkflow(stack: DetectedStack): string {
  const steps: string[] = [];

  if (stack.lintCommand) {
    steps.push(`      - name: Lint
        run: ${stack.lintCommand}`);
  }

  if (stack.hasTypeChecking) {
    const cmd =
      stack.language === 'python'
        ? 'mypy .'
        : 'npx tsc --noEmit';
    steps.push(`      - name: Type Check
        run: ${cmd}`);
  }

  if (stack.buildCommand) {
    steps.push(`      - name: Build
        run: ${stack.buildCommand}`);
  }

  if (stack.testCommand) {
    steps.push(`      - name: Test
        run: ${stack.testCommand}`);
  }

  steps.push(`      - name: Security Audit
        run: ${stack.language === 'python' ? 'pip audit' : 'npm audit --audit-level=high'}
        continue-on-error: true`);

  const setupStep =
    stack.language === 'python'
      ? `      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -r requirements.txt`
      : `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: ${stack.packageManager === 'pnpm' ? 'pnpm' : stack.packageManager === 'yarn' ? 'yarn' : 'npm'}

      - name: Install dependencies
        run: ${stack.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : stack.packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : 'npm ci'}`;

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    name: Lint, Build, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

${setupStep}

${steps.join('\n\n')}
`;
}

export function githubSecretScanWorkflow(): string {
  return `name: Secret Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  secrets:
    name: TruffleHog Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
`;
}
