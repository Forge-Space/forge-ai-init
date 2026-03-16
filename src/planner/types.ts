import type { DetectedStack } from '../types.js';
import type { ScanReport } from '../scanner.js';

export type { DetectedStack, ScanReport };

export interface ArchPlan {
  stack: DetectedStack;
  scan: ScanReport;
  structure: ProjectStructure;
  risks: ArchRisk[];
  recommendations: ArchRecommendation[];
  adrs: AdrSuggestion[];
  scalingStrategy: string;
  qualityGates: QualityGate[];
}

export interface ProjectStructure {
  totalFiles: number;
  sourceFiles: number;
  testFiles: number;
  configFiles: number;
  topDirs: string[];
  entryPoints: string[];
  testRatio: number;
}

export interface ArchRisk {
  area: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

export interface ArchRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could';
}

export interface AdrSuggestion {
  title: string;
  context: string;
  decision: string;
}

export interface QualityGate {
  phase: string;
  threshold: number;
  checks: string[];
}
