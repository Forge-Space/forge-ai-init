import { generateGitHooks } from '../../src/generators/git-hooks.js';
import type { DetectedStack } from '../../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
};

describe('generateGitHooks', () => {
  it('does not generate hooks for lite tier', () => {
    const hooks = generateGitHooks(baseStack, 'lite');
    expect(hooks).toHaveLength(0);
  });

  it('generates pre-commit, pre-push and install script for standard tier', () => {
    const hooks = generateGitHooks(baseStack, 'standard');

    expect(hooks.some((hook) => hook.path === '.githooks/pre-commit')).toBe(true);
    expect(hooks.some((hook) => hook.path === '.githooks/pre-push')).toBe(true);
    expect(hooks.some((hook) => hook.path === 'scripts/hooks/install-hooks.sh')).toBe(true);

    const preCommit = hooks.find((hook) => hook.path === '.githooks/pre-commit')?.content;
    expect(preCommit).toContain('test-autogen --staged --write --check');
  });
});
