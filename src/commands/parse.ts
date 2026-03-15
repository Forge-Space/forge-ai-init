import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import type { AITool, Tier } from '../types.js';

export function getCliVersion(): string {
  try {
    const thisDir = import.meta.dirname ?? '.';
    const pkg = JSON.parse(
      readFileSync(join(thisDir, '..', '..', 'package.json'), 'utf-8'),
    );
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function printUsage(): void {
  console.log(`
${pc.bold('forge-ai-init')} — AI Governance Layer

${pc.dim('Usage:')}
  forge-ai-init [options]
  forge-ai-init check
  forge-ai-init migrate
  forge-ai-init assess
  forge-ai-init update
  forge-ai-init baseline
  forge-ai-init plan
  forge-ai-init doctor
  forge-ai-init gate
  forge-ai-init test-autogen
  forge-ai-init scaffold
  forge-ai-init migrate-plan
  forge-ai-init ci
  forge-ai-init diff

${pc.dim('Commands:')}
  ${pc.cyan('check')}        Audit governance maturity (A-F grade)
  ${pc.cyan('migrate')}      Scan code for anti-patterns and tech debt
  ${pc.cyan('assess')}       Full migration health assessment (5 categories)
  ${pc.cyan('update')}       Re-generate governance files (auto-detects tier/tools)
  ${pc.cyan('baseline')}     Save score snapshot or compare against previous baseline
  ${pc.cyan('plan')}         Architecture-first project planning & risk analysis
  ${pc.cyan('doctor')}       Continuous architecture health monitoring
  ${pc.cyan('gate')}         CI/CD quality gate enforcement
  ${pc.cyan('test-autogen')} Auto-generate and enforce required tests for changed code
  ${pc.cyan('scaffold')}     Create new project from golden path template
  ${pc.cyan('migrate-plan')} Generate detailed migration roadmap with phases
  ${pc.cyan('ci')}           Generate CI pipeline with quality gates
  ${pc.cyan('diff')}         PR-level quality delta analysis

${pc.dim('Options:')}
  --dir <path>         Target project directory (default: .)
  --tenant <id>        Tenant identifier (or FORGE_TENANT_ID)
  --tenant-profile-ref <path>
                       Tenant profile path (or FORGE_TENANT_PROFILE_REF)
  --tier <level>       Governance tier: lite, standard, enterprise
  --tools <list>       AI tools: claude,cursor,windsurf,copilot
  --migrate            Legacy migration mode (extra rules + skills)
  --force              Overwrite existing files
  --dry-run            Show what would be created
  --yes                Skip interactive prompts
  --json               Output as JSON (migrate/assess commands)
  --staged             Scan only git-staged files (migrate command)
  --watch              Watch for file changes and re-scan (migrate command)
  --output <path>      Write report to file (migrate/assess/gate)
  --format <fmt>       Report format: json, markdown, sarif (migrate/assess/gate)
  --compare            Compare current scan against saved baseline
  --phase <phase>      Quality gate phase: foundation, stabilization, production
  --threshold <n>      Quality gate minimum score (0-100)
  --check              Enforce required generated artifacts (test-autogen command)
  --write              Write missing generated artifacts (test-autogen command)
  --template <id>      Scaffold template: nextjs-app, express-api, etc.
  --name <name>        Project name (scaffold command)
  --provider <p>       CI provider: github-actions, gitlab-ci, bitbucket
  --base <branch>      Base branch for diff comparison (default: main)
  --help               Show this help

${pc.dim('Tiers:')}
  ${pc.cyan('lite')}         Rules + hooks (solo dev / prototype)
  ${pc.cyan('standard')}     Rules + skills + MCP + CI (team / production)
  ${pc.cyan('enterprise')}   Full governance stack (org / regulated)

${pc.dim('Examples:')}
  npx forge-ai-init
  npx forge-ai-init --tier standard --tools claude,cursor --yes
  npx forge-ai-init --migrate --tier enterprise --yes
  npx forge-ai-init check
  npx forge-ai-init migrate --staged
  npx forge-ai-init assess --format markdown --output report.md
  npx forge-ai-init gate --phase production --threshold 80
  npx forge-ai-init diff --base develop --json
`);
}

export function parseArgs(
  args: string[],
): Record<string, string | boolean> {
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--force') opts['force'] = true;
    else if (arg === '--dry-run') opts['dry-run'] = true;
    else if (arg === '--yes' || arg === '-y') opts['yes'] = true;
    else if (arg === '--help' || arg === '-h') opts['help'] = true;
    else if (arg === '--migrate') opts['migrate'] = true;
    else if (arg === '--json') opts['json'] = true;
    else if (arg === '--staged') opts['staged'] = true;
    else if (arg === '--watch') opts['watch'] = true;
    else if (arg === '--compare') opts['compare'] = true;
    else if (arg === '--write') opts['write'] = true;
    else if (arg === '--check') opts['check'] = true;
    else if (arg === 'check') opts['command'] = 'check';
    else if (arg === 'migrate') opts['command'] = 'migrate';
    else if (arg === 'update') opts['command'] = 'update';
    else if (arg === 'assess') opts['command'] = 'assess';
    else if (arg === 'baseline') opts['command'] = 'baseline';
    else if (arg === 'plan') opts['command'] = 'plan';
    else if (arg === 'doctor') opts['command'] = 'doctor';
    else if (arg === 'gate') opts['command'] = 'gate';
    else if (arg === 'test-autogen') opts['command'] = 'test-autogen';
    else if (arg === 'scaffold') opts['command'] = 'scaffold';
    else if (arg === 'migrate-plan') opts['command'] = 'migrate-plan';
    else if (arg === 'ci') opts['command'] = 'ci';
    else if (arg === 'diff') opts['command'] = 'diff';
    else if (arg?.startsWith('--') && i + 1 < args.length)
      opts[arg.slice(2)] = args[++i] ?? '';
  }
  return opts;
}

const VALID_TIERS = ['lite', 'standard', 'enterprise'] as const;
const VALID_TOOLS = ['claude', 'cursor', 'windsurf', 'copilot'] as const;

export function parseTier(value?: string): Tier {
  if (!value) return 'standard';
  if (VALID_TIERS.includes(value as Tier)) return value as Tier;
  console.error(
    pc.red(`Invalid tier: ${value}. Use: ${VALID_TIERS.join(', ')}`),
  );
  process.exit(1);
}

export function parseTools(value?: string): AITool[] {
  if (!value) return ['claude'];
  const tools = value.split(',').map((t) => t.trim());
  for (const t of tools) {
    if (!VALID_TOOLS.includes(t as AITool)) {
      console.error(
        pc.red(`Invalid tool: ${t}. Use: ${VALID_TOOLS.join(', ')}`),
      );
      process.exit(1);
    }
  }
  return tools as AITool[];
}
