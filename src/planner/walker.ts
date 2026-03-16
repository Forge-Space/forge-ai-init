import { readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { IGNORE_DIRS } from '../shared.js';

export const SOURCE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.vue', '.svelte',
]);

export const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.go$/,
  /_test\.py$/,
  /test_.*\.py$/,
  /Test\.java$/,
  /Test\.kt$/,
];

export const CONFIG_EXTS = new Set([
  '.json', '.yml', '.yaml', '.toml', '.ini', '.env',
]);

export function walkProjectFiles(
  dir: string,
  maxFiles = 2000,
): { path: string; ext: string }[] {
  const results: { path: string; ext: string }[] = [];

  function walk(current: string) {
    if (results.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(join(current, entry.name));
        }
      } else {
        const ext = extname(entry.name);
        results.push({ path: join(current, entry.name), ext });
      }
    }
  }

  walk(dir);
  return results;
}
