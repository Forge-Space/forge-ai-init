import type { CIProvider, DetectedStack, Tier } from '../../types.js';
import { githubCiWorkflow, githubSecretScanWorkflow } from './github-ci.js';
import { gitlabCiPipeline } from './gitlab-ci.js';
import { scorecardWorkflow, policyCheckWorkflow, migrationGateWorkflow } from './github-enterprise.js';
import { testAutogenLearningWorkflow } from './github-autogen.js';

export interface WorkflowFiles {
  path: string;
  content: string;
}

export function generateWorkflows(
  stack: DetectedStack,
  tier: Tier,
  ciProvider?: CIProvider,
  migrate?: boolean,
): WorkflowFiles[] {
  const provider = ciProvider ?? stack.ciProvider;
  const files: WorkflowFiles[] = [];

  if (provider === 'gitlab-ci') {
    files.push({
      path: '.gitlab-ci.yml',
      content: gitlabCiPipeline(stack),
    });
    return files;
  }

  files.push({
    path: '.github/workflows/ci.yml',
    content: githubCiWorkflow(stack),
  });

  if (tier !== 'lite') {
    files.push({
      path: '.github/workflows/secret-scan.yml',
      content: githubSecretScanWorkflow(),
    });
    files.push({
      path: '.github/workflows/test-autogen-learning.yml',
      content: testAutogenLearningWorkflow(),
    });
  }

  if (tier === 'enterprise') {
    files.push({
      path: '.github/workflows/scorecard.yml',
      content: scorecardWorkflow(stack),
    });
    files.push({
      path: '.github/workflows/policy-check.yml',
      content: policyCheckWorkflow(stack),
    });
  }

  if (migrate) {
    files.push({
      path: '.github/workflows/migration-gate.yml',
      content: migrationGateWorkflow(stack),
    });
  }

  return files;
}
