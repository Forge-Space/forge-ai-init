import { execSync } from 'node:child_process';
import { extname } from 'node:path';
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

function convertToNewFindings(findings: Finding[]): DiffFinding[] {
  return findings.map((f) => ({
    file: f.file,
    rule: f.rule,
    severity: f.severity,
    message: f.message,
  }));
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

  const newFindings = convertToNewFindings(
    changedScanResult.findings,
  );

  const summary = improved
    ? `PR touches ${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'}. Quality delta: +${delta} (improved)`
    : `PR touches ${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'}. Quality delta: ${delta} (degraded). ${newFindings.length} new finding${newFindings.length === 1 ? '' : 's'}.`;

  return {
    changedFiles,
    beforeScore,
    afterScore,
    delta,
    improved,
    newFindings,
    resolvedFindings: [],
    summary,
  };
}
