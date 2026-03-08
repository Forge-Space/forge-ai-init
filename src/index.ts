import { resolve, extname } from 'node:path';
import { writeFileSync, watch } from 'node:fs';
import { execSync } from 'node:child_process';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectStack } from './detector.js';
import { generate } from './generator.js';
import { runAudit, type CheckStatus } from './checker.js';
import {
  scanProject,
  scanSpecificFiles,
  type Severity,
} from './scanner.js';
import { updateProject } from './updater.js';
import { writeReport, type ReportFormat } from './reporter.js';
import {
  assessProject,
  type AssessmentReport,
} from './assessor.js';
import type { AITool, DetectedStack, Tier } from './types.js';

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
  forge-ai-init migrate
  forge-ai-init assess
  forge-ai-init update

${pc.dim('Commands:')}
  ${pc.cyan('check')}        Audit governance maturity (A-F grade)
  ${pc.cyan('migrate')}      Scan code for anti-patterns and tech debt
  ${pc.cyan('assess')}       Full migration health assessment (5 categories)
  ${pc.cyan('update')}       Re-generate governance files (auto-detects tier/tools)

${pc.dim('Options:')}
  --dir <path>         Target project directory (default: .)
  --tier <level>       Governance tier: lite, standard, enterprise
  --tools <list>       AI tools: claude,cursor,windsurf,copilot
  --migrate            Legacy migration mode (extra rules + skills)
  --force              Overwrite existing files
  --dry-run            Show what would be created
  --yes                Skip interactive prompts
  --json               Output as JSON (migrate/assess commands)
  --staged             Scan only git-staged files (migrate command)
  --watch              Watch for file changes and re-scan (migrate command)
  --output <path>      Write report to file (migrate/assess)
  --format <fmt>       Report format: json, markdown, sarif (migrate/assess)
  --help               Show this help

${pc.dim('Tiers:')}
  ${pc.cyan('lite')}         Rules + hooks (solo dev / prototype)
  ${pc.cyan('standard')}     Rules + skills + MCP + CI (team / production)
  ${pc.cyan('enterprise')}   Full governance stack (org / regulated)

${pc.dim('Examples:')}
  npx forge-ai-init
  npx forge-ai-init --tier standard --tools claude,cursor --yes
  npx forge-ai-init --migrate --tier enterprise --yes
  npx forge-ai-init --dry-run
  npx forge-ai-init check
  npx forge-ai-init migrate
  npx forge-ai-init migrate --json
  npx forge-ai-init migrate --staged
  npx forge-ai-init migrate --watch
  npx forge-ai-init assess
  npx forge-ai-init assess --json
  npx forge-ai-init assess --format markdown --output report.md
  npx forge-ai-init update
  npx forge-ai-init update --tier enterprise
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
    else if (arg === '--migrate') opts['migrate'] = true;
    else if (arg === '--json') opts['json'] = true;
    else if (arg === '--staged') opts['staged'] = true;
    else if (arg === '--watch') opts['watch'] = true;
    else if (arg === 'check') opts['command'] = 'check';
    else if (arg === 'migrate') opts['command'] = 'migrate';
    else if (arg === 'update') opts['command'] = 'update';
    else if (arg === 'assess') opts['command'] = 'assess';
    else if (arg?.startsWith('--') && i + 1 < args.length)
      opts[arg.slice(2)] = args[++i] ?? '';
  }
  return opts;
}

const VALID_TIERS = ['lite', 'standard', 'enterprise'] as const;
const VALID_TOOLS = [
  'claude',
  'cursor',
  'windsurf',
  'copilot',
] as const;

function parseTier(value?: string): Tier {
  if (!value) return 'standard';
  if (VALID_TIERS.includes(value as Tier)) return value as Tier;
  console.error(
    pc.red(`Invalid tier: ${value}. Use: ${VALID_TIERS.join(', ')}`),
  );
  process.exit(1);
}

function parseTools(value?: string): AITool[] {
  if (!value) return ['claude'];
  const tools = value.split(',').map((t) => t.trim());
  for (const t of tools) {
    if (!VALID_TOOLS.includes(t as AITool)) {
      console.error(
        pc.red(
          `Invalid tool: ${t}. Use: ${VALID_TOOLS.join(', ')}`,
        ),
      );
      process.exit(1);
    }
  }
  return tools as AITool[];
}

function statusIcon(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return pc.green('✓');
    case 'fail':
      return pc.red('✗');
    case 'warn':
      return pc.yellow('△');
  }
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return pc.green(grade);
    case 'B':
      return pc.cyan(grade);
    case 'C':
      return pc.yellow(grade);
    case 'D':
      return pc.red(grade);
    default:
      return pc.bgRed(pc.white(` ${grade} `));
  }
}

function runCheckCommand(
  projectDir: string,
  stack: DetectedStack,
): void {
  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init check'))} — Governance Audit`,
  );
  console.log('');

  console.log(`  ${pc.dim('Project:')} ${projectDir}`);
  console.log(formatStack(stack));
  console.log('');

  const report = runAudit(projectDir, stack);

  for (const cat of report.summary) {
    const ratio = `${cat.passed}/${cat.total}`;
    const label =
      cat.passed === cat.total
        ? pc.green(ratio)
        : cat.passed === 0
          ? pc.red(ratio)
          : pc.yellow(ratio);
    console.log(
      `  ${pc.bold(cat.label)} ${pc.dim('─'.repeat(30 - cat.label.length))} ${label}`,
    );

    const catChecks = report.checks.filter(
      (c) => c.category === cat.category,
    );
    for (const check of catChecks) {
      console.log(
        `    ${statusIcon(check.status)} ${check.name}: ${pc.dim(check.detail)}`,
      );
    }
    console.log('');
  }

  console.log(
    pc.bold(
      `  Grade: ${gradeColor(report.grade)}  Score: ${report.score}/100`,
    ),
  );
  console.log('');

  const failures = report.checks.filter(
    (c) => c.status === 'fail',
  );
  const warnings = report.checks.filter(
    (c) => c.status === 'warn',
  );

  if (failures.length > 0) {
    console.log(
      `  ${pc.red(`${failures.length} critical issues:`)}`,
    );
    for (const f of failures) {
      console.log(`    ${pc.red('→')} ${f.detail}`);
    }
    console.log('');
  }

  if (warnings.length > 0 && failures.length === 0) {
    console.log(
      `  ${pc.yellow(`${warnings.length} improvements available`)}`,
    );
    console.log('');
  }

  if (report.grade === 'A') {
    console.log(
      `  ${pc.green('Excellent!')} Your project has strong AI governance.`,
    );
  } else {
    console.log(
      `  ${pc.dim('Fix issues:')} npx forge-ai-init --force`,
    );
    if (report.score < 60) {
      console.log(
        `  ${pc.dim('Migration:')} npx forge-ai-init --migrate --force`,
      );
    }
  }
  console.log('');
}

function severityColor(s: Severity): string {
  switch (s) {
    case 'critical':
      return pc.bgRed(pc.white(` ${s} `));
    case 'high':
      return pc.red(s);
    case 'medium':
      return pc.yellow(s);
    case 'low':
      return pc.dim(s);
  }
}

function runUpdateCommand(
  projectDir: string,
  stack: DetectedStack,
  opts: Record<string, string | boolean>,
): void {
  const tierOverride = opts['tier']
    ? parseTier(opts['tier'] as string)
    : undefined;
  const toolsOverride = opts['tools']
    ? parseTools(opts['tools'] as string)
    : undefined;

  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init update'))} — Updating governance files`,
  );
  console.log('');

  const report = updateProject(
    projectDir,
    stack,
    tierOverride,
    toolsOverride,
  );

  console.log(
    `  ${pc.dim('Tier:')} ${pc.cyan(report.detectedTier)}`,
  );
  console.log(
    `  ${pc.dim('Tools:')} ${report.detectedTools.map(t => pc.cyan(t)).join(', ')}`,
  );
  if (report.migrate) {
    console.log(
      `  ${pc.dim('Migration mode:')} ${pc.yellow('active')}`,
    );
  }
  console.log('');

  if (report.updated.length > 0) {
    console.log(`  ${pc.green('Updated:')}`);
    for (const f of report.updated) {
      console.log(`    ${pc.green('↻')} ${f}`);
    }
  }

  if (report.added.length > 0) {
    console.log(`  ${pc.cyan('Added:')}`);
    for (const f of report.added) {
      console.log(`    ${pc.cyan('+')} ${f}`);
    }
  }

  if (report.unchanged.length > 0) {
    console.log(
      `  ${pc.dim(`Unchanged: ${report.unchanged.length} files`)}`,
    );
  }

  console.log('');
  const total = report.updated.length + report.added.length;
  if (total === 0) {
    console.log(
      `  ${pc.green('✓')} All governance files are up to date.`,
    );
  } else {
    console.log(
      `  ${pc.green('✓')} ${total} file${total === 1 ? '' : 's'} updated.`,
    );
  }
  console.log('');
}

function getStagedFiles(dir: string): string[] {
  try {
    const output = execSync('git diff --cached --name-only', {
      cwd: dir,
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    console.error(
      pc.red('  Not a git repository or git not available'),
    );
    process.exit(1);
  }
}

function runWatchCommand(projectDir: string): void {
  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init watch'))} — Continuous Scanner`,
  );
  console.log(`  ${pc.dim('Watching:')} ${projectDir}`);
  console.log(`  ${pc.dim('Press Ctrl+C to stop')}`);
  console.log('');

  let debounce: ReturnType<typeof setTimeout> | null = null;

  const runScan = (): void => {
    const report = scanProject(projectDir);
    const now = new Date().toLocaleTimeString();
    const gradeStr = gradeColor(report.grade);
    const findingCount = report.findings.length;
    const critical = report.findings.filter(
      (f) => f.severity === 'critical',
    ).length;
    const high = report.findings.filter(
      (f) => f.severity === 'high',
    ).length;

    let line =
      `  ${pc.dim(`[${now}]`)} ${gradeStr} ${report.score}/100`;
    line +=
      ` | ${findingCount} finding${findingCount === 1 ? '' : 's'}`;
    if (critical > 0)
      line += pc.red(` (${critical} critical)`);
    else if (high > 0)
      line += pc.yellow(` (${high} high)`);
    console.log(line);

    for (const f of report.findings.slice(0, 3)) {
      console.log(
        `    ${severityColor(f.severity)} ${pc.dim(`${f.file}:${f.line}`)} ${f.message}`,
      );
    }
    if (report.findings.length > 3) {
      console.log(
        pc.dim(
          `    ... and ${report.findings.length - 3} more`,
        ),
      );
    }
  };

  runScan();

  const CODE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.vue', '.svelte',
  ]);

  watch(
    projectDir,
    { recursive: true },
    (_event, filename) => {
      if (!filename) return;
      if (!CODE_EXTS.has(extname(filename))) return;
      if (
        filename.includes('node_modules') ||
        filename.includes('.git') ||
        filename.includes('dist')
      ) return;

      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(runScan, 300);
    },
  );
}

function runScanCommand(
  projectDir: string,
  asJson: boolean,
  staged?: boolean,
  outputPath?: string,
  format?: string,
): void {
  const report = staged
    ? scanSpecificFiles(
        projectDir,
        getStagedFiles(projectDir),
      )
    : scanProject(projectDir);

  if (outputPath) {
    const fmt = (format ?? 'json') as ReportFormat;
    writeReport(report, fmt, outputPath);
    console.log(
      `  ${pc.green('✓')} Report written to ${outputPath} (${fmt})`,
    );
    return;
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const modeLabel = staged ? ' (staged files)' : '';
  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init scan'))} — Code Anti-Pattern Scanner${modeLabel}`,
  );
  console.log('');
  console.log(
    `  ${pc.dim('Project:')} ${projectDir}`,
  );
  console.log(
    `  ${pc.dim('Files scanned:')} ${report.filesScanned}`,
  );
  console.log(
    `  ${pc.dim('Findings:')} ${report.findings.length}`,
  );
  console.log('');

  if (report.summary.length > 0) {
    console.log(`  ${pc.bold('By category:')}`);
    for (const cat of report.summary) {
      const critLabel = cat.critical > 0
        ? pc.red(` (${cat.critical} critical)`)
        : '';
      const highLabel = cat.high > 0
        ? pc.yellow(` (${cat.high} high)`)
        : '';
      console.log(
        `    ${cat.category} ${pc.dim('─'.repeat(20 - cat.category.length))} ${cat.count} findings${critLabel}${highLabel}`,
      );
    }
    console.log('');
  }

  if (report.topFiles.length > 0) {
    console.log(`  ${pc.bold('Top files:')}`);
    for (const f of report.topFiles.slice(0, 5)) {
      console.log(
        `    ${severityColor(f.worst)} ${f.file} (${f.count} findings)`,
      );
    }
    console.log('');
  }

  const top = report.findings.slice(0, 15);
  if (top.length > 0) {
    console.log(`  ${pc.bold('Top findings:')}`);
    for (const f of top) {
      console.log(
        `    ${severityColor(f.severity)} ${pc.dim(`${f.file}:${f.line}`)} ${f.message}`,
      );
    }
    if (report.findings.length > 15) {
      console.log(
        pc.dim(
          `    ... and ${report.findings.length - 15} more`,
        ),
      );
    }
    console.log('');
  }

  console.log(
    pc.bold(
      `  Grade: ${gradeColor(report.grade)}  Score: ${report.score}/100`,
    ),
  );
  console.log('');

  if (report.grade !== 'A') {
    console.log(
      `  ${pc.dim('Add governance:')} npx forge-ai-init --migrate`,
    );
    console.log('');
  }
}

function runAssessCommand(
  projectDir: string,
  stack: DetectedStack,
  asJson: boolean,
  outputPath?: string,
  format?: string,
): void {
  const report = assessProject(projectDir, stack);

  if (outputPath) {
    const fmt = (format ?? 'json') as ReportFormat;
    const assessData = JSON.stringify(report, null, 2);
    const content = fmt === 'json'
      ? assessData
      : fmt === 'markdown'
        ? formatAssessMarkdown(report)
        : assessData;
    writeFileSync(outputPath, content, 'utf-8');
    console.log(
      `  ${pc.green('✓')} Assessment written to ${outputPath} (${fmt})`,
    );
    return;
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init assess'))} — Migration Health Assessment`,
  );
  console.log('');
  console.log(`  ${pc.dim('Project:')} ${projectDir}`);
  console.log(`  ${pc.dim('Files scanned:')} ${report.filesScanned}`);
  console.log('');

  for (const cat of report.categories) {
    const gradeStr = gradeColor(cat.grade);
    const critLabel = cat.critical > 0
      ? pc.red(` (${cat.critical} critical)`)
      : '';
    console.log(
      `  ${pc.bold(cat.category)} ${pc.dim('─'.repeat(22 - cat.category.length))} ${gradeStr} ${cat.score}/100${critLabel}`,
    );
  }
  console.log('');

  console.log(
    pc.bold(
      `  Overall: ${gradeColor(report.overallGrade)}  Score: ${report.overallScore}/100`,
    ),
  );
  console.log(
    `  ${pc.dim('Strategy:')} ${pc.cyan(report.migrationStrategy)}`,
  );
  console.log(
    `  ${pc.dim('Readiness:')} ${report.migrationReadiness === 'ready' ? pc.green('ready') : report.migrationReadiness === 'needs-work' ? pc.yellow('needs-work') : pc.red('high-risk')}`,
  );
  console.log('');

  const critical = report.findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  );
  if (critical.length > 0) {
    console.log(`  ${pc.bold('Top issues:')}`);
    for (const f of critical.slice(0, 10)) {
      console.log(
        `    ${severityColor(f.severity)} ${f.title}`,
      );
      if (f.file) {
        console.log(`      ${pc.dim(f.file)}`);
      }
    }
    if (critical.length > 10) {
      console.log(
        pc.dim(`    ... and ${critical.length - 10} more`),
      );
    }
    console.log('');
  }
}

function formatAssessMarkdown(
  report: AssessmentReport,
): string {
  const lines: string[] = [];
  lines.push('# forge-ai-init Assessment Report');
  lines.push('');
  lines.push(
    `**Grade:** ${report.overallGrade} | **Score:** ${report.overallScore}/100 | **Files:** ${report.filesScanned}`,
  );
  lines.push(
    `**Strategy:** ${report.migrationStrategy} | **Readiness:** ${report.migrationReadiness}`,
  );
  lines.push('');
  lines.push('## Categories');
  lines.push('');
  lines.push('| Category | Score | Grade | Findings | Critical |');
  lines.push('|----------|-------|-------|----------|----------|');
  for (const cat of report.categories) {
    lines.push(
      `| ${cat.category} | ${cat.score}/100 | ${cat.grade} | ${cat.findings} | ${cat.critical} |`,
    );
  }
  lines.push('');

  const critical = report.findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high',
  );
  if (critical.length > 0) {
    lines.push('## Critical & High Findings');
    lines.push('');
    for (const f of critical.slice(0, 30)) {
      lines.push(
        `- **${f.severity}** [${f.category}] ${f.title}`,
      );
      if (f.file) {
        lines.push(`  ${f.file}`);
      }
    }
    lines.push('');
  }

  lines.push(`*Generated by forge-ai-init v0.11.0*`);
  lines.push('');
  return lines.join('\n');
}

function printResult(
  projectDir: string,
  result: { created: string[]; skipped: string[] },
  dryRun: boolean,
  force: boolean,
): void {
  if (result.created.length > 0) {
    const verb = dryRun ? 'Would create' : 'Created';
    p.log.success(`${verb}:`);
    for (const f of result.created) {
      const rel = f.replace(projectDir + '/', '');
      console.log(`    ${pc.green('+')} ${rel}`);
    }
  }

  if (result.skipped.length > 0) {
    p.log.warn('Skipped (already exists):');
    for (const f of result.skipped) {
      const rel = f.replace(projectDir + '/', '');
      console.log(`    ${pc.yellow('~')} ${rel}`);
    }
    if (!force) {
      p.log.info('Use --force to overwrite existing files');
    }
  }

  if (result.created.length === 0 && result.skipped.length === 0) {
    p.log.info('Nothing to generate.');
  }
}

async function runInteractive(
  projectDir: string,
  stack: DetectedStack,
  force: boolean,
  dryRun: boolean,
): Promise<void> {
  p.intro(pc.bgMagenta(pc.white(' forge-ai-init ')));

  p.log.info('Detected stack:');
  console.log(formatStack(stack));

  const tier = await p.select({
    message: 'Governance tier',
    options: [
      {
        value: 'lite' as Tier,
        label: 'Lite',
        hint: 'Rules + hooks — solo dev / prototype',
      },
      {
        value: 'standard' as Tier,
        label: 'Standard',
        hint: 'Rules + skills + MCP + CI — team / production',
      },
      {
        value: 'enterprise' as Tier,
        label: 'Enterprise',
        hint: 'Full governance stack — org / regulated',
      },
    ],
    initialValue: 'standard' as Tier,
  });

  if (p.isCancel(tier)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const tools = await p.multiselect({
    message: 'AI tools to configure',
    options: [
      { value: 'claude' as AITool, label: 'Claude Code', hint: 'CLAUDE.md + settings + skills + MCP' },
      { value: 'cursor' as AITool, label: 'Cursor', hint: '.cursorrules' },
      { value: 'windsurf' as AITool, label: 'Windsurf', hint: '.windsurfrules' },
      { value: 'copilot' as AITool, label: 'GitHub Copilot', hint: 'copilot-instructions.md' },
    ],
    initialValues: ['claude' as AITool],
    required: true,
  });

  if (p.isCancel(tools)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const migrate = await p.confirm({
    message: 'Legacy migration mode? (extra rules + skills for modernizing existing codebases)',
    initialValue: false,
  });

  if (p.isCancel(migrate)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const migrateLabel = migrate
    ? ` + ${pc.yellow('migration')}`
    : '';
  const confirmed = await p.confirm({
    message: `Generate ${pc.cyan(tier)} governance for ${pc.cyan(tools.join(', '))}${migrateLabel}?`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const s = p.spinner();
  s.start('Generating governance files...');

  const result = generate(stack, {
    projectDir,
    tier,
    tools,
    force,
    dryRun,
    migrate,
  });

  s.stop('Generation complete.');

  printResult(projectDir, result, dryRun, force);

  if (!dryRun && result.created.length > 0) {
    const steps = [
      '1. Review CLAUDE.md and adjust rules to your conventions',
      '2. Commit the governance layer to your repo',
    ];
    if (migrate) {
      steps.push(
        '3. Run /migration-audit to assess codebase health',
      );
      steps.push(
        '4. Run /tech-debt-review to prioritize improvements',
      );
    }
    p.note(steps.join('\n'), 'Next steps');
  }

  p.outro(pc.green('Your project now has AI governance.'));
}

function runNonInteractive(
  projectDir: string,
  stack: DetectedStack,
  tier: Tier,
  tools: AITool[],
  force: boolean,
  dryRun: boolean,
  migrate: boolean,
): void {
  console.log('');
  console.log(
    `  ${pc.bold(pc.magenta('forge-ai-init'))} — AI Governance Layer`,
  );
  console.log('');

  console.log(`  ${pc.dim('Detected:')}`);
  console.log(formatStack(stack));
  console.log('');

  const migrateLabel = migrate
    ? ` | ${pc.yellow('migration mode')}`
    : '';
  console.log(
    `  ${pc.dim('Tier:')} ${pc.cyan(tier)} | ${pc.dim('Tools:')} ${pc.cyan(tools.join(', '))}${migrateLabel}`,
  );

  if (dryRun) {
    console.log(`  ${pc.yellow('Dry run — no files will be written')}`);
  }

  console.log('');

  const result = generate(stack, {
    projectDir,
    tier,
    tools,
    force,
    dryRun,
    migrate,
  });

  printResult(projectDir, result, dryRun, force);

  console.log('');

  if (!dryRun && result.created.length > 0) {
    console.log(`  ${pc.green('Done!')} Your project now has AI governance.`);
    console.log('');
    console.log(`  ${pc.dim('Next steps:')}`);
    console.log(
      '    1. Review CLAUDE.md and adjust rules to your conventions',
    );
    console.log(
      '    2. Commit the governance layer to your repo',
    );
    if (migrate) {
      console.log(
        '    3. Run /migration-audit to assess codebase health',
      );
      console.log(
        '    4. Run /tech-debt-review to prioritize improvements',
      );
    }
    console.log('');
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts['help']) {
    printUsage();
    return;
  }

  const projectDir = resolve((opts['dir'] as string) ?? '.');
  const force = opts['force'] === true;
  const dryRun = opts['dry-run'] === true;
  const migrate = opts['migrate'] === true;
  const interactive =
    !opts['yes'] && !opts['tier'] && !opts['tools'];

  const stack = detectStack(projectDir);

  if (opts['command'] === 'check') {
    runCheckCommand(projectDir, stack);
    return;
  }

  if (opts['command'] === 'migrate') {
    if (opts['watch']) {
      runWatchCommand(projectDir);
      return;
    }
    runScanCommand(
      projectDir,
      opts['json'] === true,
      opts['staged'] === true,
      opts['output'] as string | undefined,
      opts['format'] as string | undefined,
    );
    return;
  }

  if (opts['command'] === 'assess') {
    runAssessCommand(
      projectDir,
      stack,
      opts['json'] === true,
      opts['output'] as string | undefined,
      opts['format'] as string | undefined,
    );
    return;
  }

  if (opts['command'] === 'update') {
    runUpdateCommand(projectDir, stack, opts);
    return;
  }

  if (interactive) {
    await runInteractive(projectDir, stack, force, dryRun);
  } else {
    const tier = parseTier(opts['tier'] as string | undefined);
    const tools = parseTools(
      opts['tools'] as string | undefined,
    );
    runNonInteractive(
      projectDir,
      stack,
      tier,
      tools,
      force,
      dryRun,
      migrate,
    );
  }
}

main();
