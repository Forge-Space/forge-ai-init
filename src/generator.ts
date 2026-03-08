import { join } from 'node:path';
import type {
  DetectedStack,
  GenerateOptions,
  GenerateResult,
} from './types.js';
import { writeIfNeeded } from './utils.js';
import {
  generateClaudeMd,
  generateCopilotInstructions,
  generateCursorRules,
  generateWindsurfRules,
} from './generators/claude-md.js';
import { generateSkills } from './generators/skills.js';
import { generateSettings } from './generators/settings.js';
import { generateMcpConfig } from './generators/mcp-config.js';
import { generateWorkflows } from './generators/workflows.js';
import { generatePolicies } from './generators/policies.js';

function generateRuleFiles(
  dir: string,
  stack: DetectedStack,
  options: GenerateOptions,
  result: GenerateResult,
): void {
  const { tier, tools, force, dryRun } = options;

  if (tools.includes('claude')) {
    writeIfNeeded(
      join(dir, 'CLAUDE.md'),
      generateClaudeMd(stack, tier),
      force,
      dryRun,
      result,
    );
  }

  if (tools.includes('cursor')) {
    writeIfNeeded(
      join(dir, '.cursorrules'),
      generateCursorRules(stack, tier),
      force,
      dryRun,
      result,
    );
  }

  if (tools.includes('windsurf')) {
    writeIfNeeded(
      join(dir, '.windsurfrules'),
      generateWindsurfRules(stack, tier),
      force,
      dryRun,
      result,
    );
  }

  if (tools.includes('copilot')) {
    writeIfNeeded(
      join(dir, '.github', 'copilot-instructions.md'),
      generateCopilotInstructions(stack, tier),
      force,
      dryRun,
      result,
    );
  }
}

function generateSkillFiles(
  dir: string,
  stack: DetectedStack,
  options: GenerateOptions,
  result: GenerateResult,
): void {
  if (!options.tools.includes('claude')) return;

  const skills = generateSkills(stack, options.tier);
  for (const [path, content] of skills) {
    writeIfNeeded(
      join(dir, '.claude', 'skills', path),
      content,
      options.force,
      options.dryRun,
      result,
    );
  }
}

function generateSettingsFile(
  dir: string,
  stack: DetectedStack,
  options: GenerateOptions,
  result: GenerateResult,
): void {
  if (!options.tools.includes('claude')) return;

  const settings = generateSettings(stack, options.tier);
  writeIfNeeded(
    join(dir, '.claude', 'settings.json'),
    JSON.stringify(settings, null, 2) + '\n',
    options.force,
    options.dryRun,
    result,
  );
}

function generateMcpFile(
  dir: string,
  stack: DetectedStack,
  options: GenerateOptions,
  result: GenerateResult,
): void {
  if (options.tier === 'lite') return;

  const mcpConfig = generateMcpConfig(stack);
  if (Object.keys(mcpConfig).length === 0) return;

  writeIfNeeded(
    join(dir, '.mcp.json'),
    JSON.stringify({ mcpServers: mcpConfig }, null, 2) + '\n',
    options.force,
    options.dryRun,
    result,
  );
}

function generateWorkflowFiles(
  dir: string,
  stack: DetectedStack,
  options: GenerateOptions,
  result: GenerateResult,
): void {
  if (options.tier === 'lite') return;

  const workflows = generateWorkflows(stack, options.tier);
  for (const { path, content } of workflows) {
    writeIfNeeded(
      join(dir, path),
      content,
      options.force,
      options.dryRun,
      result,
    );
  }
}

function generatePolicyFiles(
  dir: string,
  stack: DetectedStack,
  options: GenerateOptions,
  result: GenerateResult,
): void {
  const policies = generatePolicies(stack, options.tier);
  for (const { path, content } of policies) {
    writeIfNeeded(
      join(dir, path),
      content,
      options.force,
      options.dryRun,
      result,
    );
  }
}

export function generate(
  stack: DetectedStack,
  options: GenerateOptions,
): GenerateResult {
  const result: GenerateResult = { created: [], skipped: [] };
  const dir = options.projectDir;

  generateRuleFiles(dir, stack, options, result);
  generateSettingsFile(dir, stack, options, result);
  generateSkillFiles(dir, stack, options, result);
  generateMcpFile(dir, stack, options, result);
  generateWorkflowFiles(dir, stack, options, result);
  generatePolicyFiles(dir, stack, options, result);

  return result;
}
