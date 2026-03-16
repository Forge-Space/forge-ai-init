import { readFileSync, readdirSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { IGNORE_DIRS } from '../shared.js';
import type { TypingStep } from './types.js';

export function analyzeTypingNeeds(dir: string): TypingStep[] {
  const steps: TypingStep[] = [];
  const jsFiles: { path: string; lines: number }[] = [];

  function walk(current: string) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(join(current, entry.name));
        }
      } else {
        const ext = extname(entry.name);
        if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
          const full = join(current, entry.name);
          try {
            const content = readFileSync(full, 'utf-8');
            const lines = content.split('\n').length;
            jsFiles.push({ path: relative(dir, full), lines });
          } catch { /* skip */ }
        }
      }
    }
  }

  walk(dir);

  if (jsFiles.length === 0) return [];

  const sorted = jsFiles.sort((a, b) => a.lines - b.lines);

  for (const file of sorted.slice(0, 20)) {
    const isEntry = /index\.[jm]?[jc]?sx?$|main\.[jm]?[jc]?sx?$/.test(file.path);
    const isConfig = /config|env|const/.test(file.path);
    const isUtil = /util|helper|lib/.test(file.path);

    let priority: 'high' | 'medium' | 'low' = 'medium';
    let reason = 'Standard module — convert to TypeScript';

    if (isEntry) {
      priority = 'high';
      reason = 'Entry point — types propagate to consumers';
    } else if (isUtil) {
      priority = 'high';
      reason = 'Utility module — shared across codebase, types prevent bugs';
    } else if (isConfig) {
      priority = 'medium';
      reason = 'Config file — type safety for environment variables';
    } else if (file.lines < 50) {
      priority = 'high';
      reason = 'Small file — quick win, low effort conversion';
    } else if (file.lines > 300) {
      priority = 'low';
      reason = 'Large file — convert after decomposition';
    }

    steps.push({
      file: file.path,
      priority,
      reason,
      estimatedLines: file.lines,
    });
  }

  return steps
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
}
