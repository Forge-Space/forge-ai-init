import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { extname, basename, join as pathJoin } from 'node:path';
import { tmpdir } from 'node:os';
import {
  scanProject,
  scanSpecificFiles,
  type Finding,
} from './scanner.js';
import { loadBaseline } from './baseline.js';
import { CODE_EXTENSIONS } from './shared.js';

export interface DiffOptions {
  base?: string;
  head?: string;
  staged?: boolean;
}

export interface DiffResult {
  changedFiles: string[];
  beforeScore: number;
  afterScore: number;
  delta: number;
  improved: boolean;
  newFindings: DiffFinding[];
  resolvedFindings: DiffFinding[];
  summary: string;
}

export interface DiffFinding {
  file: string;
  rule: string;
  severity: string;
  message: string;
}

/* CODE_EXTENSIONS imported from shared.ts */

function getChangedFiles(
  dir: string,
  opts: DiffOptions,
): string[] {
  try {
    let cmd: string;
    if (opts.staged) {
      cmd = 'git diff --cached --name-only';
    } else {
      const base = opts.base ?? 'main';
      const head = opts.head ?? 'HEAD';
      cmd = `git diff --name-only ${base}...${head}`;
    }

    const output = execSync(cmd, {
      encoding: 'utf-8',
      cwd: dir,
    });
    const files = output.trim().split('\n').filter(Boolean);

    return files.filter((f) => CODE_EXTENSIONS.has(extname(f)));
  } catch {
    return [];
  }
}

function convertToFindings(findings: Finding[]): DiffFinding[] {
  return findings.map((f) => ({
    file: f.file,
    rule: f.rule,
    severity: f.severity,
    message: f.message,
  }));
}

function findingKey(f: DiffFinding): string {
  return `${f.file}::${f.rule}::${f.message}`;
}

function getBaseFindings(
  dir: string,
  files: string[],
  base: string,
): DiffFinding[] {
  let tmpDir: string | null = null;
  try {
    tmpDir = mkdtempSync(pathJoin(tmpdir(), 'forge-diff-'));
    const tmpFiles: string[] = [];

    for (const file of files) {
      try {
        const content = execSync(
          `git -C ${JSON.stringify(dir)} show ${base}:${file}`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] },
        );
        const tmpFile = pathJoin(tmpDir, basename(file));
        writeFileSync(tmpFile, content);
        tmpFiles.push(tmpFile);
      } catch {
        // file didn't exist at base — new file, no base findings
      }
    }

    if (tmpFiles.length === 0) return [];
    const result = scanSpecificFiles(tmpDir, tmpFiles.map((f) => basename(f)));
    return convertToFindings(result.findings).map((f) => ({
      ...f,
      file: files[tmpFiles.indexOf(pathJoin(tmpDir!, f.file))] ?? f.file,
    }));
  } catch {
    return [];
  } finally {
    if (tmpDir) {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /**/ }
    }
  }
}

export function analyzeDiff(
  dir: string,
  opts: DiffOptions = {},
): DiffResult {
  const changedFiles = getChangedFiles(dir, opts);

  if (changedFiles.length === 0) {
    return {
      changedFiles: [],
      beforeScore: 100,
      afterScore: 100,
      delta: 0,
      improved: true,
      newFindings: [],
      resolvedFindings: [],
      summary: 'No changed files detected',
    };
  }

  const fullScanResult = scanProject(dir);
  const changedScanResult = scanSpecificFiles(dir, changedFiles);

  const baselineData = loadBaseline(dir);
  const lastEntry = baselineData?.history.at(-1);
  const beforeScore = lastEntry?.score ?? fullScanResult.score;
  const afterScore = fullScanResult.score;
  const delta = afterScore - beforeScore;
  const improved = delta >= 0;

  const currentFindings = convertToFindings(changedScanResult.findings);
  const currentKeys = new Set(currentFindings.map(findingKey));

  const base = opts.staged ? 'HEAD' : (opts.base ?? 'main');
  const baseFindings = getBaseFindings(dir, changedFiles, base);
  const baseKeys = new Set(baseFindings.map(findingKey));

  const newFindings = currentFindings.filter((f) => !baseKeys.has(findingKey(f)));
  const resolvedFindings = baseFindings.filter((f) => !currentKeys.has(findingKey(f)));

  const summary = improved
    ? `PR touches ${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'}. Quality delta: +${delta} (improved). ${resolvedFindings.length} finding${resolvedFindings.length === 1 ? '' : 's'} resolved.`
    : `PR touches ${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'}. Quality delta: ${delta} (degraded). ${newFindings.length} new finding${newFindings.length === 1 ? '' : 's'}.`;

  return {
    changedFiles,
    beforeScore,
    afterScore,
    delta,
    improved,
    newFindings,
    resolvedFindings,
    summary,
  };
}
