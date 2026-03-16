import type { DetectedStack } from './types.js';
import { type Grade, walkFiles, scoreToGrade } from './shared.js';
import {
  type AssessmentCategory,
  type Severity,
  type AssessmentFinding,
  type CategoryScore,
  type AssessmentReport,
} from './assessors/types.js';
import { collectDependencyFindings } from './assessors/dependencies.js';
import { collectArchitectureFindings } from './assessors/architecture.js';
import { collectSecurityFindings } from './assessors/security.js';
import { collectQualityFindings } from './assessors/quality.js';
import { collectMigrationReadiness } from './assessors/migration.js';

export type { AssessmentCategory, Severity, AssessmentFinding, CategoryScore, AssessmentReport };
export type { Grade };

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

function scoreCategoryFindings(findings: AssessmentFinding[]): number {
  const penalty = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHTS[f.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

function determineMigrationReadiness(
  score: number,
  findings: AssessmentFinding[],
): AssessmentReport['migrationReadiness'] {
  const criticals = findings.filter((f) => f.severity === 'critical').length;
  if (criticals > 3 || score < 30) return 'high-risk';
  if (score < 60) return 'needs-work';
  return 'ready';
}

function detectMigrationStrategy(stack: DetectedStack): string {
  if (
    stack.framework === 'express' ||
    stack.framework === 'fastapi' ||
    stack.framework === 'django' ||
    stack.framework === 'flask'
  ) {
    return 'strangler-fig';
  }
  if (
    stack.framework === 'react' ||
    stack.framework === 'vue' ||
    stack.framework === 'nextjs'
  ) {
    return 'branch-by-abstraction';
  }
  if (stack.language === 'java') {
    return 'parallel-run';
  }
  return 'strangler-fig';
}

function generateSummary(report: Omit<AssessmentReport, 'summary'>): string {
  const lines: string[] = [];
  lines.push(`Health Score: ${report.overallScore}/100 (${report.overallGrade})`);
  lines.push(`Migration Readiness: ${report.migrationReadiness}`);
  lines.push(`Recommended Strategy: ${report.migrationStrategy}`);
  lines.push(`Files Scanned: ${report.filesScanned}`);
  lines.push(`Total Findings: ${report.findings.length}`);
  const criticals = report.findings.filter((f) => f.severity === 'critical').length;
  if (criticals > 0) {
    lines.push(`Critical Issues: ${criticals} — fix before migration`);
  }
  return lines.join('\n');
}

export function assessProject(
  dir: string,
  stack: DetectedStack,
  maxFiles = 500,
): AssessmentReport {
  const files = walkFiles(dir, maxFiles);

  const depFindings = collectDependencyFindings(dir, stack);
  const archFindings = collectArchitectureFindings(dir, files);
  const secFindings = collectSecurityFindings(dir, files);
  const qualFindings = collectQualityFindings(dir, stack, files);
  const migFindings = collectMigrationReadiness(dir, stack, files);

  const allFindings = [
    ...depFindings,
    ...archFindings,
    ...secFindings,
    ...qualFindings,
    ...migFindings,
  ];

  allFindings.sort((a, b) => {
    const order: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  const categoryMap: Record<AssessmentCategory, AssessmentFinding[]> = {
    dependencies: depFindings,
    architecture: archFindings,
    security: secFindings,
    quality: qualFindings,
    'migration-readiness': migFindings,
  };

  const categories: CategoryScore[] = (
    Object.entries(categoryMap) as Array<[AssessmentCategory, AssessmentFinding[]]>
  ).map(([cat, catFindings]) => {
    const score = scoreCategoryFindings(catFindings);
    return {
      category: cat,
      score,
      grade: scoreToGrade(score),
      findings: catFindings.length,
      critical: catFindings.filter((f) => f.severity === 'critical').length,
      high: catFindings.filter((f) => f.severity === 'high').length,
    };
  });

  const overallScore = Math.round(
    categories.reduce((s, c) => s + c.score, 0) / categories.length,
  );

  const partial = {
    findings: allFindings,
    categories,
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    filesScanned: files.length,
    migrationStrategy: detectMigrationStrategy(stack),
    migrationReadiness: determineMigrationReadiness(overallScore, allFindings),
    summary: '',
  };

  return { ...partial, summary: generateSummary(partial) };
}
