import { readFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import {
  CODE_EXTENSIONS,
  walkFiles,
  scoreToGrade,
} from './shared.js';
import {
  loadConfig,
  isRuleDisabled,
  getRuleSeverity,
  isCategoryEnabled,
  isFileIgnored,
  type ForgeConfig,
} from './config.js';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FindingCategory =
  | 'architecture'
  | 'error-handling'
  | 'scalability'
  | 'hardcoded-values'
  | 'engineering'
  | 'security'
  | 'async'
  | 'react'
  | 'accessibility'
  | 'type-safety';

export interface Finding {
  file: string;
  line: number;
  category: FindingCategory;
  severity: Severity;
  rule: string;
  message: string;
}

export interface ScanReport {
  findings: Finding[];
  filesScanned: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: CategoryScore[];
  topFiles: FileScore[];
}

export interface CategoryScore {
  category: FindingCategory;
  count: number;
  critical: number;
  high: number;
}

export interface FileScore {
  file: string;
  count: number;
  worst: Severity;
}

export interface Rule {
  pattern: RegExp;
  category: FindingCategory;
  severity: Severity;
  rule: string;
  message: string;
  extensions?: string[];
}

import { RULES } from './rules/index.js';

/* walkFiles, CODE_EXTENSIONS, IGNORE_DIRS imported from shared.ts */

function checkFileSize(
  relPath: string,
  lines: string[],
): Finding[] {
  const findings: Finding[] = [];
  const content = lines.join('\n');

  if (lines.length > 500) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'high',
      rule: 'god-file',
      message: `${lines.length} lines — split into smaller modules`,
    });
  } else if (lines.length > 300) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'medium',
      rule: 'large-file',
      message: `${lines.length} lines — consider splitting`,
    });
  }

  const ext = extname(relPath);
  const fnPattern = ext === '.py'
    ? /(?:^|\n)\s*(?:def|async\s+def)\s+\w+/g
    : ext === '.go'
      ? /^func\s+/gm
      : ext === '.rs'
        ? /(?:^|\n)\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+/g
        : ext === '.java'
          ? /(?:public|private|protected|static|\s)+\s+\w+\s+\w+\s*\(/gm
          : ext === '.kt' || ext === '.kts'
            ? /(?:^|\n)\s*(?:(?:private|public|internal|protected|override)\s+)*(?:suspend\s+)?fun\s+/g
            : /(?:function\s+\w+|(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g;
  const fnCount = (content.match(fnPattern) || []).length;
  if (fnCount > 15) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'high',
      rule: 'function-sprawl',
      message: `${fnCount} functions — too many responsibilities`,
    });
  } else if (fnCount > 10) {
    findings.push({
      file: relPath,
      line: 1,
      category: 'architecture',
      severity: 'medium',
      rule: 'many-functions',
      message: `${fnCount} functions — consider splitting`,
    });
  }

  return findings;
}

function scanFile(
  filePath: string,
  base: string,
  config: ForgeConfig,
): Finding[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const relPath = relative(base, filePath);

  if (isFileIgnored(config, relPath)) return [];

  const lines = content.split('\n');
  const findings: Finding[] = [];

  findings.push(...checkFileSize(relPath, lines));

  const fileExt = extname(filePath);

  for (const rule of RULES) {
    if (rule.extensions && !rule.extensions.includes(fileExt))
      continue;
    if (isRuleDisabled(config, rule.rule)) continue;
    if (!isCategoryEnabled(config, rule.category)) continue;

    const severity = getRuleSeverity(
      config,
      rule.rule,
      rule.severity,
    );

    const regex = new RegExp(
      rule.pattern.source,
      rule.pattern.flags,
    );
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line =
        content.slice(0, match.index).split('\n').length;
      findings.push({
        file: relPath,
        line,
        category: rule.category,
        severity,
        rule: rule.rule,
        message: rule.message,
      });
    }
  }

  return findings;
}

function scoreFromFindings(findings: Finding[]): number {
  const weights: Record<Severity, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };
  const penalty = findings.reduce(
    (sum, f) => sum + weights[f.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

/* gradeFromScore imported as scoreToGrade from shared.ts */
const gradeFromScore = scoreToGrade;

function buildReport(
  allFindings: Finding[],
  filesScanned: number,
): ScanReport {
  allFindings.sort((a, b) => {
    const order: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  const categories = [
    ...new Set(allFindings.map((f) => f.category)),
  ] as FindingCategory[];

  const summary: CategoryScore[] = categories.map((cat) => {
    const catFindings = allFindings.filter(
      (f) => f.category === cat,
    );
    return {
      category: cat,
      count: catFindings.length,
      critical: catFindings.filter(
        (f) => f.severity === 'critical',
      ).length,
      high: catFindings.filter((f) => f.severity === 'high')
        .length,
    };
  });

  summary.sort(
    (a, b) =>
      b.critical * 10 +
      b.high * 5 -
      (a.critical * 10 + a.high * 5),
  );

  const fileMap = new Map<string, Finding[]>();
  for (const f of allFindings) {
    const arr = fileMap.get(f.file) ?? [];
    arr.push(f);
    fileMap.set(f.file, arr);
  }

  const topFiles: FileScore[] = [...fileMap.entries()]
    .map(([file, findings]) => ({
      file,
      count: findings.length,
      worst: findings.reduce(
        (w, f) => {
          const order: Record<Severity, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          return order[f.severity] < order[w]
            ? f.severity
            : w;
        },
        'low' as Severity,
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const score = scoreFromFindings(allFindings);

  return {
    findings: allFindings,
    filesScanned,
    score,
    grade: gradeFromScore(score),
    summary,
    topFiles,
  };
}

export function scanSpecificFiles(
  dir: string,
  filePaths: string[],
): ScanReport {
  const config = loadConfig(dir);
  const files = filePaths.filter(
    (f) => CODE_EXTENSIONS.has(extname(f)),
  );
  const allFindings: Finding[] = [];

  for (const file of files) {
    const full = join(dir, file);
    allFindings.push(...scanFile(full, dir, config));
  }

  return buildReport(allFindings, files.length);
}

export function scanProject(
  dir: string,
  maxFiles = 500,
): ScanReport {
  const config = loadConfig(dir);
  const limit = config.maxFiles ?? maxFiles;
  const files = walkFiles(dir, limit);
  const allFindings: Finding[] = [];

  for (const file of files) {
    allFindings.push(...scanFile(file, dir, config));
  }

  return buildReport(allFindings, files.length);
}
