import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GenerateResult } from './types.js';

export function writeIfNeeded(
  filePath: string,
  content: string,
  force: boolean,
  dryRun: boolean,
  result: GenerateResult,
): void {
  if (existsSync(filePath) && !force) {
    result.skipped.push(filePath);
    return;
  }

  if (dryRun) {
    result.created.push(filePath);
    return;
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
  result.created.push(filePath);
}
