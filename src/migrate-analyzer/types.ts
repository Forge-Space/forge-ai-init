export interface MigrationPlan {
  strategy: MigrationStrategy;
  boundaries: StranglerBoundary[];
  typingPlan: TypingStep[];
  dependencyRisks: DependencyRisk[];
  phases: MigrationPhase[];
  estimatedEffort: string;
}

export interface MigrationStrategy {
  name: string;
  description: string;
  applicableTo: string;
}

export interface StranglerBoundary {
  module: string;
  type: 'api' | 'service' | 'data' | 'ui';
  complexity: 'low' | 'medium' | 'high';
  reason: string;
  dependents: number;
}

export interface TypingStep {
  file: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedLines: number;
}

export interface DependencyRisk {
  name: string;
  currentVersion: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface MigrationPhase {
  name: string;
  description: string;
  tasks: string[];
  gate: string;
}
