import type { DetectedStack } from '../../types.js';

export function gitlabCiPipeline(stack: DetectedStack): string {
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
