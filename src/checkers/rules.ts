import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult } from '../checker.js';

function fileExists(dir: string, ...paths: string[]): boolean {
  return existsSync(join(dir, ...paths));
}

function fileContains(dir: string, path: string, text: string): boolean {
  const full = join(dir, path);
  if (!existsSync(full)) return false;
  try {
    return readFileSync(full, 'utf-8').includes(text);
  } catch {
    return false;
  }
}

export function checkRules(dir: string): CheckResult[] {
  const results: CheckResult[] = [];

  const hasClaudeMd = fileExists(dir, 'CLAUDE.md');
  results.push({
    name: 'CLAUDE.md',
    status: hasClaudeMd ? 'pass' : 'fail',
    detail: hasClaudeMd
      ? 'AI rules file found'
      : 'No CLAUDE.md — AI tools have no project rules',
    category: 'rules',
    weight: 3,
  });

  if (hasClaudeMd) {
    const hasGovernance = fileContains(dir, 'CLAUDE.md', 'AI Code Governance');
    results.push({
      name: 'AI governance rules',
      status: hasGovernance ? 'pass' : 'warn',
      detail: hasGovernance
        ? 'AI governance section found'
        : 'CLAUDE.md lacks AI governance rules — run forge-ai-init --force to update',
      category: 'rules',
      weight: 2,
    });

    const hasAntiPatterns = fileContains(dir, 'CLAUDE.md', 'Anti-Patterns');
    results.push({
      name: 'Anti-pattern rules',
      status: hasAntiPatterns ? 'pass' : 'warn',
      detail: hasAntiPatterns
        ? 'Anti-pattern detection rules found'
        : 'No anti-pattern rules — AI may generate copy-paste code',
      category: 'rules',
      weight: 2,
    });
  }

  const hasCursor = fileExists(dir, '.cursorrules');
  const hasWindsurf = fileExists(dir, '.windsurfrules');
  const hasCopilot = fileExists(dir, '.github', 'copilot-instructions.md');
  const toolCount = [hasCursor, hasWindsurf, hasCopilot].filter(Boolean).length;

  results.push({
    name: 'Multi-tool rules',
    status: toolCount >= 2 ? 'pass' : toolCount === 1 ? 'warn' : hasClaudeMd ? 'warn' : 'fail',
    detail:
      toolCount >= 2
        ? `${toolCount + (hasClaudeMd ? 1 : 0)} AI tool rule files found`
        : hasClaudeMd
          ? 'Only CLAUDE.md — consider adding rules for other AI tools'
          : 'No AI tool rule files found',
    category: 'rules',
    weight: 1,
  });

  return results;
}
