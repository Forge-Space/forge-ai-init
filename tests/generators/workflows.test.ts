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
  });
});
