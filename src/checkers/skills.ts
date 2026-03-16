import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult } from '../checker.js';

function fileExists(dir: string, ...paths: string[]): boolean {
  return existsSync(join(dir, ...paths));
}

function dirHasFiles(dir: string, ...paths: string[]): boolean {
  const full = join(dir, ...paths);
  if (!existsSync(full)) return false;
  try {
    return readdirSync(full).length > 0;
  } catch {
    return false;
  }
}

export function checkSkills(dir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const skillsDir = join(dir, '.claude', 'skills');
  const hasSkills = dirHasFiles(dir, '.claude', 'skills');

  results.push({
    name: 'AI skills',
    status: hasSkills ? 'pass' : 'fail',
    detail: hasSkills
      ? 'Skills directory found'
      : 'No .claude/skills/ — AI tools lack specialized workflows',
    category: 'skills',
    weight: 2,
  });

  if (hasSkills) {
    const skillNames = [
      'quality-gate',
      'security-check',
      'code-conscience',
      'test-autogen',
      'arch-review',
      'test-first',
      'migration-audit',
      'tech-debt-review',
      'dependency-audit',
      'scalability-review',
    ];

    let count = 0;
    for (const name of skillNames) {
      if (fileExists(skillsDir, name, 'SKILL.md')) count++;
    }

    results.push({
      name: 'Skill coverage',
      status: count >= 5 ? 'pass' : count >= 3 ? 'warn' : 'fail',
      detail: `${count} of ${skillNames.length} governance skills configured`,
      category: 'skills',
      weight: 2,
    });
  }

  return results;
}
