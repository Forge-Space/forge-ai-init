import { resolve } from 'node:path';
import pc from 'picocolors';
import { detectStack } from './detector.js';
import type { DetectedStack } from './types.js';

function formatStack(stack: DetectedStack): string {
  const lines: string[] = [];

  lines.push(
    `  Language:     ${pc.cyan(stack.language)}${stack.framework ? ` (${pc.cyan(stack.framework)})` : ''}`,
  );

  if (stack.buildTool)
    lines.push(`  Build:        ${pc.cyan(stack.buildTool)}`);

  lines.push(`  Package Mgr:  ${pc.cyan(stack.packageManager)}`);
  lines.push(
    `  Monorepo:     ${stack.monorepo ? pc.yellow('Yes') : 'No'}`,
  );

  if (stack.testFramework)
    lines.push(`  Tests:        ${pc.cyan(stack.testFramework)}`);

  lines.push(
    `  Linting:      ${stack.hasLinting ? pc.green('Yes') : pc.red('No')}`,
  );
  lines.push(
    `  Type Check:   ${stack.hasTypeChecking ? pc.green('Yes') : pc.red('No')}`,
  );
  lines.push(
    `  Formatting:   ${stack.hasFormatting ? pc.green('Yes') : pc.red('No')}`,
  );
  lines.push(
    `  CI/CD:        ${stack.hasCi ? pc.green(stack.ciProvider ?? 'Yes') : pc.red('No')}`,
  );

  if (stack.buildCommand)
    lines.push(`  Build cmd:    ${pc.dim(stack.buildCommand)}`);
  if (stack.testCommand)
    lines.push(`  Test cmd:     ${pc.dim(stack.testCommand)}`);
  if (stack.lintCommand)
    lines.push(`  Lint cmd:     ${pc.dim(stack.lintCommand)}`);

  return lines.join('\n');
}

function printUsage(): void {
  console.log(`
${pc.bold('forge-ai-init')} — AI Governance Layer

${pc.dim('Usage:')}
  forge-ai-init [options]
  forge-ai-init check
  forge-ai-init update

${pc.dim('Options:')}
  --dir <path>         Target project directory (default: .)
  --tier <level>       Governance tier: lite, standard, enterprise
  --tools <list>       AI tools: claude,cursor,windsurf,copilot
  --force              Overwrite existing files
  --dry-run            Show what would be created
  --yes                Skip interactive prompts
  --help               Show this help

${pc.dim('Tiers:')}
  ${pc.cyan('lite')}         Rules + hooks (solo dev / prototype)
  ${pc.cyan('standard')}     Rules + skills + MCP + CI (team / production)
  ${pc.cyan('enterprise')}   Full governance stack (org / regulated)

${pc.dim('Examples:')}
  npx forge-ai-init
  npx forge-ai-init --tier standard --tools claude,cursor --yes
  npx forge-ai-init --dry-run
  npx forge-ai-init check
`);
}

function parseArgs(
  args: string[],
): Record<string, string | boolean> {
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--force') opts['force'] = true;
    else if (arg === '--dry-run') opts['dry-run'] = true;
    else if (arg === '--yes' || arg === '-y') opts['yes'] = true;
    else if (arg === '--help' || arg === '-h') opts['help'] = true;
    else if (arg === 'check') opts['command'] = 'check';
    else if (arg === 'update') opts['command'] = 'update';
    else if (arg?.startsWith('--') && i + 1 < args.length)
      opts[arg.slice(2)] = args[++i] ?? '';
  }
  return opts;
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  if (opts['help']) {
    printUsage();
    return;
  }

  const projectDir = resolve((opts['dir'] as string) ?? '.');

  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init'))} — AI Governance Layer`,
  );
  console.log('');

  const stack = detectStack(projectDir);

  console.log(`  ${pc.dim('Detected:')}`);
  console.log(formatStack(stack));
  console.log('');

  if (opts['command'] === 'check') {
    console.log(pc.yellow('  Check mode not yet implemented.'));
    return;
  }

  if (opts['command'] === 'update') {
    console.log(pc.yellow('  Update mode not yet implemented.'));
    return;
  }

  console.log(
    pc.yellow('  Generation not yet implemented. Coming soon!'),
  );
}

main();
