import type { DetectedStack } from '../types.js';
import { scanProject } from '../scanner.js';
import type { ArchPlan } from './types.js';
import { analyzeStructure } from './structure.js';
import { detectRisks } from './risks.js';
import { generateRecommendations, suggestAdrs } from './recommendations.js';
import { determineScalingStrategy, defineQualityGates } from './strategy.js';

export function generatePlan(
  dir: string,
  stack: DetectedStack,
): ArchPlan {
  const scan = scanProject(dir);
  const structure = analyzeStructure(dir);
  const risks = detectRisks(stack, scan, structure);
  const recommendations = generateRecommendations(stack, scan, structure);
  const adrs = suggestAdrs(stack, structure);
  const scalingStrategy = determineScalingStrategy(stack);
  const qualityGates = defineQualityGates();

  return {
    stack,
    scan,
    structure,
    risks,
    recommendations,
    adrs,
    scalingStrategy,
    qualityGates,
  };
}
