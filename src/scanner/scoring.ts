import { scoreToGrade } from '../shared.js';
import type { Finding, ScanReport, CategoryScore, FileScore, Severity, FindingCategory } from './types.js';

function scoreFromFindings(findings: Finding[]): number {
  const weights: Record<Severity, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function buildSummary(allFindings: Finding[]): CategoryScore[] {
  const categories = [...new Set(allFindings.map((f) => f.category))] as FindingCategory[];

  const summary = categories.map((cat) => {
    const catFindings = allFindings.filter((f) => f.category === cat);
    return {
      category: cat,
      count: catFindings.length,
      critical: catFindings.filter((f) => f.severity === 'critical').length,
      high: catFindings.filter((f) => f.severity === 'high').length,
    };
  });

  return summary.sort(
    (a, b) => b.critical * 10 + b.high * 5 - (a.critical * 10 + a.high * 5),
  );
}

function buildTopFiles(allFindings: Finding[]): FileScore[] {
  const fileMap = new Map<string, Finding[]>();
  for (const f of allFindings) {
    const arr = fileMap.get(f.file) ?? [];
    arr.push(f);
    fileMap.set(f.file, arr);
  }

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  return [...fileMap.entries()]
    .map(([file, findings]) => ({
      file,
      count: findings.length,
      worst: findings.reduce(
        (w, f) => (order[f.severity] < order[w] ? f.severity : w),
        'low' as Severity,
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function buildReport(allFindings: Finding[], filesScanned: number): ScanReport {
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const score = scoreFromFindings(allFindings);

  return {
    findings: allFindings,
    filesScanned,
    score,
    grade: scoreToGrade(score),
    summary: buildSummary(allFindings),
    topFiles: buildTopFiles(allFindings),
  };
}
