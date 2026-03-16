import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult } from '../checker.js';

export function checkHooks(dir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const settingsPath = join(dir, '.claude', 'settings.json');
  const hasSettings = existsSync(settingsPath);

  results.push({
    name: 'Claude settings',
    status: hasSettings ? 'pass' : 'fail',
    detail: hasSettings
      ? 'Settings file found'
      : 'No .claude/settings.json — no safety hooks configured',
    category: 'hooks',
    weight: 2,
  });

  if (hasSettings) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      const hasPreHooks = settings?.hooks?.PreToolUse?.length > 0;
      const hasPostHooks = settings?.hooks?.PostToolUse?.length > 0;
      const preToolHooks = settings?.hooks?.PreToolUse ?? [];
      const hasTestAutogenHook = preToolHooks.some((hook: {
        hooks?: Array<{ command?: string }>;
      }) =>
        (hook.hooks ?? []).some((inner) =>
          inner.command?.includes('test-autogen') ?? false,
        ),
      );

      results.push({
        name: 'Pre-tool hooks',
        status: hasPreHooks ? 'pass' : 'warn',
        detail: hasPreHooks
          ? 'Safety hooks active before tool execution'
          : 'No PreToolUse hooks — destructive commands not guarded',
        category: 'hooks',
        weight: 2,
      });

      results.push({
        name: 'Post-tool hooks',
        status: hasPostHooks ? 'pass' : 'warn',
        detail: hasPostHooks
          ? 'Auto-formatting hooks active after edits'
          : 'No PostToolUse hooks — no auto-formatting',
        category: 'hooks',
        weight: 1,
      });

      results.push({
        name: 'Test autogen hook',
        status: hasTestAutogenHook ? 'pass' : 'warn',
        detail: hasTestAutogenHook
          ? 'Commit hook enforces test-autogen checks'
          : 'No test-autogen hook — test requirements may be missed pre-commit',
        category: 'hooks',
        weight: 2,
      });
    } catch {
      results.push({
        name: 'Settings parse',
        status: 'warn',
        detail: 'Could not parse settings.json',
        category: 'hooks',
        weight: 1,
      });
    }
  }

  return results;
}
