import { loadConfig } from './config.js';

export interface CiOptions {
  provider: 'github-actions' | 'gitlab-ci' | 'bitbucket';
  phase?: 'foundation' | 'stabilization' | 'production';
  threshold?: number;
  includeBaseline?: boolean;
}

export interface CiResult {
  provider: string;
  filePath: string;
  content: string;
  commands: string[];
}

const PHASE_THRESHOLDS: Record<string, number> = {
  foundation: 40,
  stabilization: 60,
  production: 80,
};

function getPhaseAndThreshold(
  dir: string,
  opts: CiOptions,
): { phase: string; threshold: number } {
  const config = loadConfig(dir);

  const phase = opts.phase ?? 'foundation';

  let threshold = opts.threshold;
  if (!threshold) {
    threshold = config.thresholds?.pr ?? PHASE_THRESHOLDS[phase] ?? 40;
  }

  return { phase, threshold };
}

function generateGitHubActions(
  phase: string,
  threshold: number,
  includeBaseline: boolean,
): string {
  const baselineStep = includeBaseline
    ? `      - name: Generate baseline
        run: npx forge-ai-init baseline`
    : '';

  return `name: Forge Quality Gate
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm ci
      - name: Run migration scan
        run: npx forge-ai-init migrate --json > scan-report.json
      - name: Quality gate check
        run: npx forge-ai-init gate --phase ${phase} --threshold ${threshold} --json
${baselineStep}`;
}

function generateGitLabCi(
  phase: string,
  threshold: number,
  includeBaseline: boolean,
): string {
  const baselineScript = includeBaseline
    ? '    - npx forge-ai-init baseline'
    : '';

  return `forge-quality:
  stage: test
  image: node:22
  script:
    - npm ci
    - npx forge-ai-init migrate --json > scan-report.json
    - npx forge-ai-init gate --phase ${phase} --threshold ${threshold} --json
${baselineScript}
  artifacts:
    paths:
      - scan-report.json`;
}

function generateBitbucket(
  phase: string,
  threshold: number,
  includeBaseline: boolean,
): string {
  const baselineScript = includeBaseline
    ? '            - npx forge-ai-init baseline'
    : '';

  return `pipelines:
  pull-requests:
    '**':
      - step:
          name: Forge Quality Gate
          image: node:22
          script:
            - npm ci
            - npx forge-ai-init migrate --json > scan-report.json
            - npx forge-ai-init gate --phase ${phase} --threshold ${threshold} --json
${baselineScript}`;
}

export function generateCiPipeline(
  dir: string,
  opts: CiOptions,
): CiResult {
  const { phase, threshold } = getPhaseAndThreshold(dir, opts);
  const includeBaseline = opts.includeBaseline ?? false;

  const commands: string[] = [
    'npx forge-ai-init migrate --json > scan-report.json',
    `npx forge-ai-init gate --phase ${phase} --threshold ${threshold} --json`,
  ];

  if (includeBaseline) {
    commands.push('npx forge-ai-init baseline');
  }

  let filePath: string;
  let content: string;

  switch (opts.provider) {
    case 'github-actions':
      filePath = '.github/workflows/forge-quality.yml';
      content = generateGitHubActions(phase, threshold, includeBaseline);
      break;
    case 'gitlab-ci':
      filePath = '.gitlab-ci.yml';
      content = generateGitLabCi(phase, threshold, includeBaseline);
      break;
    case 'bitbucket':
      filePath = 'bitbucket-pipelines.yml';
      content = generateBitbucket(phase, threshold, includeBaseline);
      break;
  }

  return {
    provider: opts.provider,
    filePath,
    content,
    commands,
  };
}
