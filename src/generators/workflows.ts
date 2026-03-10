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
  migrate?: boolean,
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
    files.push({
      path: '.github/workflows/test-autogen-learning.yml',
      content: testAutogenLearningWorkflow(),
    });
  }

  if (tier === 'enterprise') {
    files.push({
      path: '.github/workflows/scorecard.yml',
      content: scorecardWorkflow(stack),
    });
    files.push({
      path: '.github/workflows/policy-check.yml',
      content: policyCheckWorkflow(stack),
    });
  }

  if (migrate) {
    files.push({
      path: '.github/workflows/migration-gate.yml',
      content: migrationGateWorkflow(stack),
    });
  }

  return files;
}

function scorecardWorkflow(stack: DetectedStack): string {
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

function policyCheckWorkflow(_stack: DetectedStack): string {
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

function migrationGateWorkflow(_stack: DetectedStack): string {
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

function testAutogenLearningWorkflow(): string {
  return `name: Test Autogen Learning

on:
  schedule:
    - cron: '0 12 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  learning:
    name: Weekly Test Autogen Learning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies (if package-lock exists)
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          fi

      - name: Build telemetry summary
        run: |
          mkdir -p .forge
          node <<'NODE'
          const fs = require('node:fs');
          const path = require('node:path');
          const telemetryPath = path.join('.forge', 'test-autogen-telemetry.jsonl');
          const lines = fs.existsSync(telemetryPath)
            ? fs.readFileSync(telemetryPath, 'utf8').trim().split('\\n').filter(Boolean)
            : [];

          let runs = 0;
          let passed = 0;
          let created = 0;
          let missing = 0;

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.event !== 'test-autogen') continue;
              runs += 1;
              if (event.passed === true) passed += 1;
              created += Number(event.created ?? 0);
              missing += Number(event.missing ?? 0);
            } catch {}
          }

          const passRate = runs === 0 ? 'n/a' : String(Math.round((passed / runs) * 100)) + '%';
          const report = [
            '# Test Autogen Weekly Learning',
            '',
            '- Runs: ' + runs,
            '- Pass rate: ' + passRate,
            '- Tests created: ' + created,
            '- Missing required tests: ' + missing,
            '',
            '## Recommended next actions',
            '- Review recurring misses and update path heuristics.',
            '- Tune integration/e2e detection for repeated false positives.',
            '- Keep raw snippets disabled unless explicit opt-in is approved.',
            '',
            'Generated at: ' + new Date().toISOString(),
          ].join('\\n');

          fs.writeFileSync(path.join('.forge', 'test-autogen-learning.md'), report + '\\n');
          NODE

      - name: Snapshot test-autogen status
        run: npx forge-ai-init test-autogen --check --json --tenant "$FORGE_TENANT_ID" --tenant-profile-ref "$FORGE_TENANT_PROFILE_REF" > .forge/test-autogen-latest.json || true

      - name: Open learning PR
        uses: peter-evans/create-pull-request@v7
        with:
          branch: chore/test-autogen-learning
          delete-branch: true
          title: "chore(test-autogen): weekly learning report"
          commit-message: "chore: update weekly test-autogen learning report"
          body: |
            Weekly learning report generated from test-autogen telemetry metadata.
            This PR must be reviewed manually and should not be auto-merged.
          add-paths: |
            .forge/test-autogen-learning.md
            .forge/test-autogen-latest.json
`;
}
