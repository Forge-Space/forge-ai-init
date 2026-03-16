import { readdirSync } from 'node:fs';
import { IGNORE_DIRS } from '../shared.js';
import type { ProjectStructure } from './types.js';
import { walkProjectFiles, SOURCE_EXTS, TEST_PATTERNS, CONFIG_EXTS } from './walker.js';

export function analyzeStructure(dir: string): ProjectStructure {
  const files = walkProjectFiles(dir);
  const sourceFiles = files.filter((f) => SOURCE_EXTS.has(f.ext));
  const testFiles = files.filter((f) =>
    TEST_PATTERNS.some((p) => p.test(f.path)),
  );
  const configFiles = files.filter((f) => CONFIG_EXTS.has(f.ext));

  let topDirs: string[] = [];
  try {
    topDirs = readdirSync(dir, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          !IGNORE_DIRS.has(e.name) &&
          !e.name.startsWith('.'),
      )
      .map((e) => e.name);
  } catch { /* empty */ }

  const entryPoints = files
    .filter((f) =>
      /index\.[jt]sx?$|main\.[jt]sx?$|app\.[jt]sx?$|__main__\.py$|main\.go$|main\.rs$/
        .test(f.path),
    )
    .map((f) => f.path.replace(dir + '/', ''));

  const testRatio =
    sourceFiles.length > 0
      ? Math.round((testFiles.length / sourceFiles.length) * 100)
      : 0;

  return {
    totalFiles: files.length,
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    configFiles: configFiles.length,
    topDirs,
    entryPoints: entryPoints.slice(0, 10),
    testRatio,
  };
}
