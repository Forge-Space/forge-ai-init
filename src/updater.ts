import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, dirname } from 'node:path';
import type {
  DetectedStack,
  Tier,
  AITool,
} from './types.js';
import {
  generateClaudeMd,
  generateCursorRules,
  generateWindsurfRules,
  generateCopilotInstructions,
} from './generators/claude-md.js';
import { generateSkills } from './generators/skills.js';
import { generateSettings } from './generators/settings.js';
import { generateMcpConfig } from './generators/mcp-config.js';
import { generateWorkflows } from './generators/workflows.js';
import { generateGitHooks } from './generators/git-hooks.js';
import { generatePolicies } from './generators/policies.js';
import { generateMigrationFiles } from './generators/migration.js';

export interface UpdateReport {
  updated: string[];
  added: string[];
  unchanged: string[];
  detectedTier: Tier;
  detectedTools: AITool[];
  migrate: boolean;
}

function detectExistingTools(dir: string): AITool[] {
  const tools: AITool[] = [];
  if (existsSync(join(dir, 'CLAUDE.md'))) tools.push('claude');
  if (existsSync(join(dir, '.cursorrules'))) tools.push('cursor');
  if (existsSync(join(dir, '.windsurfrules'))) tools.push('windsurf');
  if (existsSync(join(dir, '.github', 'copilot-instructions.md')))
    tools.push('copilot');
  return tools.length > 0 ? tools : ['claude'];
}

function detectExistingTier(dir: string): Tier {
  if (existsSync(join(dir, '.forge', 'policies')))
    return 'enterprise';
  if (
    existsSync(join(dir, '.claude', 'skills')) ||
    existsSync(join(dir, '.mcp.json'))
  )
    return 'standard';
  return 'lite';
}

function detectMigrationMode(dir: string): boolean {
  const claudeMd = join(dir, 'CLAUDE.md');
  if (!existsSync(claudeMd)) return false;
  try {
    return readFileSync(claudeMd, 'utf-8').includes(
      'Legacy Migration',
    );
  } catch {
    return false;
  }
}

function writeIfChanged(
  filePath: string,
  content: string,
  report: UpdateReport,
  baseDir: string,
): void {
  const rel = relative(baseDir, filePath);

  if (existsSync(filePath)) {
    try {
      const existing = readFileSync(filePath, 'utf-8');
      if (existing === content) {
        report.unchanged.push(rel);
        return;
      }
    } catch {
      // can't read — overwrite
    }
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
    report.updated.push(rel);
  } else {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
    report.added.push(rel);
  }
}

export function updateProject(
  dir: string,
  stack: DetectedStack,
  tierOverride?: Tier,
  toolsOverride?: AITool[],
): UpdateReport {
  const tier = tierOverride ?? detectExistingTier(dir);
  const tools = toolsOverride ?? detectExistingTools(dir);
  const migrate = detectMigrationMode(dir);

  const report: UpdateReport = {
    updated: [],
    added: [],
    unchanged: [],
    detectedTier: tier,
    detectedTools: tools,
    migrate,
  };

  if (tools.includes('claude')) {
    writeIfChanged(
      join(dir, 'CLAUDE.md'),
      generateClaudeMd(stack, tier, migrate),
      report,
      dir,
    );
  }

  if (tools.includes('cursor')) {
    writeIfChanged(
      join(dir, '.cursorrules'),
      generateCursorRules(stack, tier, migrate),
      report,
      dir,
    );
  }

  if (tools.includes('windsurf')) {
    writeIfChanged(
      join(dir, '.windsurfrules'),
      generateWindsurfRules(stack, tier, migrate),
      report,
      dir,
    );
  }

  if (tools.includes('copilot')) {
    writeIfChanged(
      join(dir, '.github', 'copilot-instructions.md'),
      generateCopilotInstructions(stack, tier, migrate),
      report,
      dir,
    );
  }

  if (tools.includes('claude')) {
    writeIfChanged(
      join(dir, '.claude', 'settings.json'),
      JSON.stringify(generateSettings(stack, tier), null, 2) +
        '\n',
      report,
      dir,
    );

    if (tier !== 'lite') {
      const skills = generateSkills(stack, tier, migrate);
      for (const [path, content] of skills) {
        writeIfChanged(
          join(dir, '.claude', 'skills', path),
          content,
          report,
          dir,
        );
      }
    }
  }

  if (tier !== 'lite') {
    const mcpConfig = generateMcpConfig(stack);
    if (Object.keys(mcpConfig).length > 0) {
      writeIfChanged(
        join(dir, '.mcp.json'),
        JSON.stringify({ mcpServers: mcpConfig }, null, 2) +
          '\n',
        report,
        dir,
      );
    }

    const workflows = generateWorkflows(
      stack,
      tier,
      undefined,
      migrate,
    );
    for (const { path, content } of workflows) {
      writeIfChanged(
        join(dir, path),
        content,
        report,
        dir,
      );
    }

    const hooks = generateGitHooks(stack, tier);
    for (const { path, content } of hooks) {
      writeIfChanged(
        join(dir, path),
        content,
        report,
        dir,
      );
    }
  }

  const policies = generatePolicies(stack, tier, migrate);
  for (const { path, content } of policies) {
    writeIfChanged(
      join(dir, path),
      content,
      report,
      dir,
    );
  }

  if (migrate) {
    const migrationFiles = generateMigrationFiles(stack, tier);
    for (const { path, content } of migrationFiles) {
      writeIfChanged(
        join(dir, path),
        content,
        report,
        dir,
      );
    }
  }

  return report;
}
