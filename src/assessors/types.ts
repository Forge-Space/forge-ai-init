import type { Grade } from '../shared.js';

export type AssessmentCategory =
  | 'dependencies'
  | 'architecture'
  | 'security'
  | 'quality'
  | 'migration-readiness';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface AssessmentFinding {
  category: AssessmentCategory;
  severity: Severity;
  title: string;
  detail: string;
  file?: string;
  line?: number;
}

export interface CategoryScore {
  category: AssessmentCategory;
  score: number;
  grade: Grade;
  findings: number;
  critical: number;
  high: number;
}

export interface AssessmentReport {
  findings: AssessmentFinding[];
  categories: CategoryScore[];
  overallScore: number;
  overallGrade: Grade;
  filesScanned: number;
  migrationStrategy: string;
  migrationReadiness: 'ready' | 'needs-work' | 'high-risk';
  summary: string;
}
