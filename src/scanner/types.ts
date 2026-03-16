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
