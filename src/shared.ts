import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join } from 'path';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.vue', '.svelte', '.php', '.rb', '.cs',
  '.properties', '.yml', '.yaml',
]);

export const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', '.venv', 'venv', 'target', 'coverage',
  '.turbo', '.cache', 'vendor', '.bundle',
]);

export function walkFiles(dir: string, maxFiles: number): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue;
      const full = join(current, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (stat.isFile() && CODE_EXTENSIONS.has(extname(entry))) {
          files.push(full);
        }
      } catch {
        continue;
      }
    }
  }

  walk(dir);
  return files;
}

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function readJson(
  path: string,
): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}
