import { generateSettings } from '../../src/generators/settings.js';
import type { DetectedStack } from '../../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: false,
};

describe('generateSettings', () => {
  it('includes safety hooks for all tiers', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: { PreToolUse: Array<{ matcher: string }> };
    };
    const matchers = settings.hooks.PreToolUse.map(
      h => h.matcher,
    );
    expect(matchers.some(m => m.includes('rm -rf'))).toBe(true);
    expect(matchers.some(m => m.includes('git push.*main'))).toBe(
      true,
    );
  });

  it('includes formatting hooks when formatting is present', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: { PostToolUse: Array<{ matcher: string }> };
    };
    expect(settings.hooks.PostToolUse.length).toBeGreaterThan(0);
    expect(
      settings.hooks.PostToolUse.some(h =>
        h.matcher.includes('Edit'),
      ),
    ).toBe(true);
  });

  it('skips formatting hooks when no formatter', () => {
    const noFormat = { ...baseStack, hasFormatting: false };
    const settings = generateSettings(noFormat, 'lite') as {
      hooks: { PostToolUse: Array<{ matcher: string }> };
    };
    expect(settings.hooks.PostToolUse.length).toBe(0);
  });

  it('adds git workflow hooks for standard+ tiers', () => {
    const settings = generateSettings(baseStack, 'standard') as {
      hooks: { PreToolUse: Array<{ matcher: string }> };
    };
    const matchers = settings.hooks.PreToolUse.map(
      h => h.matcher,
    );
    expect(matchers.some(m => m.includes('git push'))).toBe(true);
    expect(matchers.some(m => m.includes('gh pr create'))).toBe(
      true,
    );
  });

  it('skips git workflow hooks for lite tier', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: { PreToolUse: Array<{ matcher: string }> };
    };
    const matchers = settings.hooks.PreToolUse.map(
      h => h.matcher,
    );
    expect(
      matchers.some(m => m === 'Bash(git push)'),
    ).toBe(false);
  });

  it('adds pre-commit quality gate for standard tier', () => {
    const settings = generateSettings(
      baseStack,
      'standard',
    ) as {
      hooks: {
        PreToolUse: Array<{
          matcher: string;
          hooks: Array<{ command?: string }>;
        }>;
      };
    };
    const commitHook = settings.hooks.PreToolUse.find(h =>
      h.matcher.includes('git commit'),
    );
    expect(commitHook).toBeDefined();
    expect(commitHook!.hooks[0]!.command).toContain('test-autogen');
    expect(commitHook!.hooks[0]!.command).toContain('60');
  });

  it('uses higher threshold for enterprise tier', () => {
    const settings = generateSettings(
      baseStack,
      'enterprise',
    ) as {
      hooks: {
        PreToolUse: Array<{
          matcher: string;
          hooks: Array<{ command?: string }>;
        }>;
      };
    };
    const commitHook = settings.hooks.PreToolUse.find(h =>
      h.matcher.includes('git commit'),
    );
    expect(commitHook).toBeDefined();
    expect(commitHook!.hooks[0]!.command).toContain('75');
  });

  it('skips pre-commit hook for lite tier', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: { PreToolUse: Array<{ matcher: string }> };
    };
    const commitHook = settings.hooks.PreToolUse.find(h =>
      h.matcher.includes('git commit'),
    );
    expect(commitHook).toBeUndefined();
  });

  it('uses ruff format for python projects (line 43-44)', () => {
    const pythonStack = { ...baseStack, language: 'python' as const };
    const settings = generateSettings(pythonStack, 'lite') as {
      hooks: {
        PostToolUse: Array<{
          matcher: string;
          hooks: Array<{ command?: string }>;
        }>;
      };
    };
    const formatHook = settings.hooks.PostToolUse.find((h) =>
      h.hooks.some((hook) => hook.command?.includes('ruff')),
    );
    expect(formatHook).toBeDefined();
    expect(formatHook!.hooks[0]!.command).toContain('ruff format');
  });

  it('uses prettier for non-python projects (line 45)', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: {
        PostToolUse: Array<{
          matcher: string;
          hooks: Array<{ command?: string }>;
        }>;
      };
    };
    const formatHook = settings.hooks.PostToolUse.find((h) =>
      h.hooks.some((hook) => hook.command?.includes('prettier')),
    );
    expect(formatHook).toBeDefined();
    expect(formatHook!.hooks[0]!.command).toContain('prettier');
  });

  it('includes secret protection hooks', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: {
        PreToolUse: Array<{
          matcher: string;
          hooks: Array<{ command?: string }>;
        }>;
      };
    };
    const secretHook = settings.hooks.PreToolUse.find(
      h =>
        h.hooks.some(
          hook =>
            hook.command?.includes('.env') ?? false,
        ),
    );
    expect(secretHook).toBeDefined();
  });

  it('preCommitHooks returns empty array for lite tier (line 88)', () => {
    const settings = generateSettings(baseStack, 'lite') as {
      hooks: { PreToolUse: Array<{ matcher: string }> };
    };
    // lite tier: no git commit hook in PreToolUse
    const commitHook = settings.hooks.PreToolUse.find(h =>
      h.matcher.includes('git commit'),
    );
    expect(commitHook).toBeUndefined();
    // Verify lite tier still has the safety and secret hooks
    expect(settings.hooks.PreToolUse.length).toBeGreaterThan(0);
  });
});
