import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  scanProject,
  type ScanReport,
  type CategoryScore,
} from './scanner.js';

export interface BaselineEntry {
  timestamp: string;
  score: number;
  grade: string;
  filesScanned: number;
  findingCount: number;
  categories: CategoryScore[];
}

export interface BaselineData {
  version: 1;
  history: BaselineEntry[];
}

const BASELINE_DIR = '.forge';
const BASELINE_FILE = 'baseline.json';

function baselinePath(dir: string): string {
  return join(dir, BASELINE_DIR, BASELINE_FILE);
}

export function loadBaseline(dir: string): BaselineData | null {
  const path = baselinePath(dir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as BaselineData;
  } catch {
    return null;
  }
}

function reportToEntry(report: ScanReport): BaselineEntry {
  return {
    timestamp: new Date().toISOString(),
    score: report.score,
    grade: report.grade,
    filesScanned: report.filesScanned,
    findingCount: report.findings.length,
    categories: report.summary,
  };
}

export function saveBaseline(dir: string): {
  entry: BaselineEntry;
  isFirst: boolean;
} {
  const report = scanProject(dir);
  const entry = reportToEntry(report);
  const existing = loadBaseline(dir);
  const data: BaselineData = existing ?? { version: 1, history: [] };
  data.history.push(entry);

  const forgeDir = join(dir, BASELINE_DIR);
  if (!existsSync(forgeDir)) mkdirSync(forgeDir, { recursive: true });
  writeFileSync(baselinePath(dir), JSON.stringify(data, null, 2) + '\n');

  return { entry, isFirst: !existing };
}

export interface BaselineComparison {
  current: BaselineEntry;
  previous: BaselineEntry;
  scoreDelta: number;
  gradeChanged: boolean;
  categoryChanges: CategoryChange[];
  newFindings: number;
  resolvedFindings: number;
}

export interface CategoryChange {
  category: string;
  previousCount: number;
  currentCount: number;
  delta: number;
}

export function compareBaseline(dir: string): BaselineComparison | null {
  const report = scanProject(dir);
  const current = reportToEntry(report);
  const data = loadBaseline(dir);

  if (!data || data.history.length === 0) return null;

  const previous = data.history[data.history.length - 1];
  if (!previous) return null;

  const categoryChanges: CategoryChange[] = [];
  const allCategories = new Set([
    ...previous.categories.map((c) => c.category),
    ...current.categories.map((c) => c.category),
  ]);

  for (const cat of allCategories) {
    const prev = previous.categories.find((c) => c.category === cat);
    const curr = current.categories.find((c) => c.category === cat);
    const previousCount = prev?.count ?? 0;
    const currentCount = curr?.count ?? 0;
    if (previousCount !== currentCount) {
      categoryChanges.push({
        category: cat,
        previousCount,
        currentCount,
        delta: currentCount - previousCount,
      });
    }
  }

  const resolvedFindings = Math.max(
    0,
    previous.findingCount - current.findingCount,
  );
  const newFindings = Math.max(
    0,
    current.findingCount - previous.findingCount,
  );

  return {
    current,
    previous,
    scoreDelta: current.score - previous.score,
    gradeChanged: current.grade !== previous.grade,
    categoryChanges,
    newFindings,
    resolvedFindings,
  };
}
