import type { DetectedStack } from '../types.js';
import { scanProject } from '../scanner.js';
import { detectStrategy } from './strategy.js';
import { findStranglerBoundaries } from './boundaries.js';
import { analyzeTypingNeeds } from './typing-needs.js';
import { analyzeDependencyRisks } from './dependency-risks.js';
import { buildPhases, estimateEffort } from './phases.js';
import type { MigrationPlan } from './types.js';

export function analyzeMigration(
  dir: string,
  stack: DetectedStack,
): MigrationPlan {
  const scan = scanProject(dir);
  const strategy = detectStrategy(stack);
  const boundaries = findStranglerBoundaries(dir, scan);
  const typingPlan = analyzeTypingNeeds(dir);
  const dependencyRisks = analyzeDependencyRisks(dir);
  const phases = buildPhases(scan, boundaries, typingPlan, dependencyRisks);
  const estimatedEffort = estimateEffort(
    boundaries,
    typingPlan,
    dependencyRisks,
    scan,
  );

  return {
    strategy,
    boundaries,
    typingPlan,
    dependencyRisks,
    phases,
    estimatedEffort,
  };
}
