import type { CIProvider, DetectedStack, Tier } from '../types.js';

function githubCiWorkflow(stack: DetectedStack): string {
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

function githubSecretScanWorkflow(): string {
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

function gitlabCiPipeline(stack: DetectedStack): string {
  const stages: string[] = [];
  const jobs: string[] = [];

  const setupScript =
    stack.language === 'python'
      ? `  image: python:3.12
  before_script:
    - pip install -r requirements.txt`
      : `  image: node:22
  before_script:
    - ${stack.packageManager === 'pnpm' ? 'corepack enable && pnpm install --frozen-lockfile' : stack.packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : 'npm ci'}`;

  if (stack.lintCommand) {
    stages.push('lint');
    jobs.push(`lint:
  stage: lint
${setupScript}
  script:
    - ${stack.lintCommand}`);
  }

  if (stack.hasTypeChecking) {
    stages.push('typecheck');
    const cmd =
      stack.language === 'python'
        ? 'mypy .'
        : 'npx tsc --noEmit';
    jobs.push(`typecheck:
  stage: typecheck
${setupScript}
  script:
    - ${cmd}`);
  }

  if (stack.buildCommand) {
    stages.push('build');
    jobs.push(`build:
  stage: build
${setupScript}
  script:
    - ${stack.buildCommand}
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour`);
  }

  if (stack.testCommand) {
    stages.push('test');
    jobs.push(`test:
  stage: test
${setupScript}
  script:
    - ${stack.testCommand}
  coverage: '/Statements\\s*:\\s*(\\d+\\.?\\d*)%/'`);
  }

  stages.push('security');
  const auditCmd =
    stack.language === 'python' ? 'pip audit' : 'npm audit --audit-level=high';
  jobs.push(`security-audit:
  stage: security
${setupScript}
  script:
    - ${auditCmd}
  allow_failure: true`);

  return `stages:
  - ${stages.join('\n  - ')}

${jobs.join('\n\n')}
`;
}

export interface WorkflowFiles {
  path: string;
  content: string;
}

export function generateWorkflows(
  stack: DetectedStack,
  tier: Tier,
  ciProvider?: CIProvider,
): WorkflowFiles[] {
  const provider = ciProvider ?? stack.ciProvider;
  const files: WorkflowFiles[] = [];

  if (provider === 'gitlab-ci') {
    files.push({
      path: '.gitlab-ci.yml',
      content: gitlabCiPipeline(stack),
    });
    return files;
  }

  files.push({
    path: '.github/workflows/ci.yml',
    content: githubCiWorkflow(stack),
  });

  if (tier !== 'lite') {
    files.push({
      path: '.github/workflows/secret-scan.yml',
      content: githubSecretScanWorkflow(),
    });
  }

  return files;
}
