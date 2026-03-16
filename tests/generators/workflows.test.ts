import { generateWorkflows } from '../../src/generators/workflows.js';
import type { DetectedStack } from '../../src/types.js';

function makeStack(
  overrides: Partial<DetectedStack> = {},
): DetectedStack {
  return {
    language: 'typescript',
    packageManager: 'npm',
    monorepo: false,
    hasLinting: true,
    hasTypeChecking: true,
    hasFormatting: true,
    hasCi: true,
    ciProvider: 'github-actions',
    buildCommand: 'npm run build',
    testCommand: 'npm run test',
    lintCommand: 'npm run lint',
    ...overrides,
  };
}

describe('generateWorkflows', () => {
  describe('GitHub Actions', () => {
    it('generates ci.yml with correct steps', () => {
      const files = generateWorkflows(makeStack(), 'standard');
      const ci = files.find((f) => f.path.includes('ci.yml'));
      expect(ci).toBeDefined();
      expect(ci!.content).toContain('name: CI');
      expect(ci!.content).toContain('npm run build');
      expect(ci!.content).toContain('npm run test');
      expect(ci!.content).toContain('npm run lint');
      expect(ci!.content).toContain('node-version: 22');
    });

    it('generates secret-scan.yml for standard tier', () => {
      const files = generateWorkflows(makeStack(), 'standard');
      const scan = files.find((f) =>
        f.path.includes('secret-scan'),
      );
      expect(scan).toBeDefined();
      expect(scan!.content).toContain('TruffleHog');
    });

    it('generates weekly test-autogen learning workflow for standard tier', () => {
      const files = generateWorkflows(makeStack(), 'standard');
      const learning = files.find((f) =>
        f.path.includes('test-autogen-learning'),
      );
      expect(learning).toBeDefined();
      expect(learning!.content).toContain('schedule:');
      expect(learning!.content).toContain('create-pull-request');
      expect(learning!.content).toContain('test-autogen --check --json');
    });

    it('skips secret-scan for lite tier', () => {
      const files = generateWorkflows(makeStack(), 'lite');
      const scan = files.find((f) =>
        f.path.includes('secret-scan'),
      );
      expect(scan).toBeUndefined();
    });

    it('uses pnpm cache when pnpm detected', () => {
      const files = generateWorkflows(
        makeStack({ packageManager: 'pnpm' }),
        'standard',
      );
      const ci = files.find((f) => f.path.includes('ci.yml'));
      expect(ci!.content).toContain('cache: pnpm');
      expect(ci!.content).toContain('pnpm install --frozen-lockfile');
    });

    it('uses Python setup for Python projects', () => {
      const files = generateWorkflows(
        makeStack({
          language: 'python',
          testCommand: 'pytest',
          lintCommand: 'ruff check',
        }),
        'standard',
      );
      const ci = files.find((f) => f.path.includes('ci.yml'));
      expect(ci!.content).toContain('setup-python');
      expect(ci!.content).toContain('pytest');
      expect(ci!.content).toContain('pip audit');
    });
  });

  describe('Enterprise workflows', () => {
    it('generates scorecard and policy-check for enterprise', () => {
      const files = generateWorkflows(makeStack(), 'enterprise');
      const paths = files.map((f) => f.path);
      expect(paths).toContain('.github/workflows/scorecard.yml');
      expect(paths).toContain('.github/workflows/policy-check.yml');
    });
  });

  describe('Migration workflows', () => {
    it('generates migration-gate.yml when migrate is true', () => {
      const files = generateWorkflows(makeStack(), 'standard', undefined, true);
      const gate = files.find((f) => f.path.includes('migration-gate'));
      expect(gate).toBeDefined();
      expect(gate!.content).toContain('Migration Quality Gate');
      expect(gate!.content).toContain('forge-ai-init check');
      expect(gate!.content).toContain('forge-policy');
    });

    it('skips migration-gate when migrate is false', () => {
      const files = generateWorkflows(makeStack(), 'standard');
      const gate = files.find((f) => f.path.includes('migration-gate'));
      expect(gate).toBeUndefined();
    });

    it('enterprise + migrate generates all workflows', () => {
      const files = generateWorkflows(makeStack(), 'enterprise', undefined, true);
      const paths = files.map((f) => f.path);
      expect(paths).toContain('.github/workflows/ci.yml');
      expect(paths).toContain('.github/workflows/secret-scan.yml');
      expect(paths).toContain('.github/workflows/test-autogen-learning.yml');
      expect(paths).toContain('.github/workflows/scorecard.yml');
      expect(paths).toContain('.github/workflows/policy-check.yml');
      expect(paths).toContain('.github/workflows/migration-gate.yml');
    });
  });

  describe('GitLab CI', () => {
    it('generates .gitlab-ci.yml instead of GitHub workflows', () => {
      const files = generateWorkflows(
        makeStack({ ciProvider: 'gitlab-ci' }),
        'standard',
        'gitlab-ci',
      );
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe('.gitlab-ci.yml');
    });

    it('includes correct stages', () => {
      const files = generateWorkflows(
        makeStack({ ciProvider: 'gitlab-ci' }),
        'standard',
        'gitlab-ci',
      );
      const content = files[0]!.content;
      expect(content).toContain('stages:');
      expect(content).toContain('lint');
      expect(content).toContain('test');
      expect(content).toContain('security');
    });

    it('uses node:22 image for JS projects', () => {
      const files = generateWorkflows(
        makeStack({ ciProvider: 'gitlab-ci' }),
        'standard',
        'gitlab-ci',
      );
      expect(files[0]!.content).toContain('image: node:22');
    });

    it('uses python image for Python projects', () => {
      const files = generateWorkflows(
        makeStack({
          language: 'python',
          ciProvider: 'gitlab-ci',
          testCommand: 'pytest',
          lintCommand: 'ruff check',
        }),
        'standard',
        'gitlab-ci',
      );
      const content = files[0]!.content;
      expect(content).toContain('image: python:3.12');
      expect(content).toContain('pytest');
      expect(content).toContain('pip audit');
    });

    it('includes coverage regex for test stage', () => {
      const files = generateWorkflows(
        makeStack({ ciProvider: 'gitlab-ci' }),
        'standard',
        'gitlab-ci',
      );
      expect(files[0]!.content).toContain('coverage:');
    });

    it('allows security audit to fail', () => {
      const files = generateWorkflows(
        makeStack({ ciProvider: 'gitlab-ci' }),
        'standard',
        'gitlab-ci',
      );
      expect(files[0]!.content).toContain('allow_failure: true');
    });

    it('uses yarn install for yarn packageManager in GitLab CI', () => {
      const files = generateWorkflows(
        makeStack({ ciProvider: 'gitlab-ci', packageManager: 'yarn' }),
        'standard',
        'gitlab-ci',
      );
      expect(files[0]!.content).toContain('yarn install --frozen-lockfile');
    });

    it('omits lint stage when lintCommand is undefined', () => {
      const files = generateWorkflows(
        makeStack({
          ciProvider: 'gitlab-ci',
          lintCommand: undefined,
          hasLinting: false,
        }),
        'standard',
        'gitlab-ci',
      );
      const content = files[0]!.content;
      expect(content).not.toContain('stage: lint');
    });

    it('omits build stage when buildCommand is undefined', () => {
      const files = generateWorkflows(
        makeStack({
          ciProvider: 'gitlab-ci',
          buildCommand: undefined,
        }),
        'standard',
        'gitlab-ci',
      );
      const content = files[0]!.content;
      expect(content).not.toContain('stage: build');
    });
  });

  describe('yarn packageManager support', () => {
    it('uses yarn cache and yarn install in GitHub CI', () => {
      const files = generateWorkflows(
        makeStack({ packageManager: 'yarn' }),
        'standard',
      );
      const ci = files.find((f) => f.path.includes('ci.yml'));
      expect(ci!.content).toContain('cache: yarn');
      expect(ci!.content).toContain('yarn install --frozen-lockfile');
    });

    it('enterprise tier scorecard uses yarn cache for yarn projects', () => {
      const files = generateWorkflows(
        makeStack({ packageManager: 'yarn' }),
        'enterprise',
      );
      const scorecard = files.find((f) =>
        f.path.includes('scorecard.yml'),
      );
      expect(scorecard!.content).toContain('cache: yarn');
      expect(scorecard!.content).toContain('yarn install --frozen-lockfile');
    });
  });
});
