import { join, extname } from 'node:path';
import { CODE_EXTENSIONS, walkFiles } from '../shared.js';
import { loadConfig } from '../config.js';
import type { ScanReport } from './types.js';
import { scanFile } from './pattern-matcher.js';
import { buildReport } from './scoring.js';

export function scanSpecificFiles(dir: string, filePaths: string[]): ScanReport {
  const config = loadConfig(dir);
  const files = filePaths.filter((f) => CODE_EXTENSIONS.has(extname(f)));
  const allFindings = files.flatMap((file) => scanFile(join(dir, file), dir, config));
  return buildReport(allFindings, files.length);
}

export function scanProject(dir: string, maxFiles = 500): ScanReport {
  const config = loadConfig(dir);
  const limit = config.maxFiles ?? maxFiles;
  const files = walkFiles(dir, limit);
  const allFindings = files.flatMap((file) => scanFile(file, dir, config));
  return buildReport(allFindings, files.length);
}
