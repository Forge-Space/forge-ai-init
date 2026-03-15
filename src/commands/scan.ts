import { watch } from 'node:fs';
import { extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import pc from 'picocolors';
import { scanProject, scanSpecificFiles } from '../scanner.js';
import { formatReport, writeReport, type ReportFormat } from '../reporter.js';
import { updateProject } from '../updater.js';
import type { DetectedStack } from '../types.js';
import { gradeColor, severityColor } from './ui.js';
import { parseTier, parseTools } from './parse.js';

export function getStagedFiles(dir: string): string[] {
  try {
    const output = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: dir,
      encoding: 'utf-8',
    });
    return output.split('\n').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
  } catch {
    console.error(pc.red('  Not a git repository or git not available'));
    process.exit(1);
  }
}

export function runUpdateCommand(
  projectDir: string,
  stack: DetectedStack,
  opts: Record<string, string | boolean>,
): void {
  const tierOverride = opts['tier'] ? parseTier(opts['tier'] as string) : undefined;
  const toolsOverride = opts['tools'] ? parseTools(opts['tools'] as string) : undefined;

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init update'))} — Updating governance files`);
  console.log('');

  const report = updateProject(projectDir, stack, tierOverride, toolsOverride);

  console.log(`  ${pc.dim('Tier:')} ${pc.cyan(report.detectedTier)}`);
  console.log(`  ${pc.dim('Tools:')} ${report.detectedTools.map((t) => pc.cyan(t)).join(', ')}`);
  if (report.migrate) {
    console.log(`  ${pc.dim('Migration mode:')} ${pc.yellow('active')}`);
  }
  console.log('');

  if (report.updated.length > 0) {
    console.log(`  ${pc.green('Updated:')}`);
    for (const f of report.updated) console.log(`    ${pc.green('↻')} ${f}`);
  }

  if (report.added.length > 0) {
    console.log(`  ${pc.cyan('Added:')}`);
    for (const f of report.added) console.log(`    ${pc.cyan('+')} ${f}`);
  }

  if (report.unchanged.length > 0) {
    console.log(`  ${pc.dim(`Unchanged: ${report.unchanged.length} files`)}`);
  }

  console.log('');
  const total = report.updated.length + report.added.length;
  if (total === 0) {
    console.log(`  ${pc.green('✓')} All governance files are up to date.`);
  } else {
    console.log(`  ${pc.green('✓')} ${total} file${total === 1 ? '' : 's'} updated.`);
  }
  console.log('');
}

export function runWatchCommand(projectDir: string): void {
  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init watch'))} — Continuous Scanner`);
  console.log(`  ${pc.dim('Watching:')} ${projectDir}`);
  console.log(`  ${pc.dim('Press Ctrl+C to stop')}`);
  console.log('');

  let debounce: ReturnType<typeof setTimeout> | null = null;

  const runScan = (): void => {
    const report = scanProject(projectDir);
    const now = new Date().toLocaleTimeString();
    const gradeStr = gradeColor(report.grade);
    const findingCount = report.findings.length;
    const critical = report.findings.filter((f) => f.severity === 'critical').length;
    const high = report.findings.filter((f) => f.severity === 'high').length;

    let line = `  ${pc.dim(`[${now}]`)} ${gradeStr} ${report.score}/100`;
    line += ` | ${findingCount} finding${findingCount === 1 ? '' : 's'}`;
    if (critical > 0) line += pc.red(` (${critical} critical)`);
    else if (high > 0) line += pc.yellow(` (${high} high)`);
    console.log(line);

    for (const f of report.findings.slice(0, 3)) {
      console.log(
        `    ${severityColor(f.severity)} ${pc.dim(`${f.file}:${f.line}`)} ${f.message}`,
      );
    }
    if (report.findings.length > 3) {
      console.log(pc.dim(`    ... and ${report.findings.length - 3} more`));
    }
  };

  runScan();

  const CODE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.vue', '.svelte',
  ]);

  watch(projectDir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    if (!CODE_EXTS.has(extname(filename))) return;
    if (filename.includes('node_modules') || filename.includes('.git') || filename.includes('dist')) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(runScan, 300);
  });
}

export function runScanCommand(
  projectDir: string,
  asJson: boolean,
  staged?: boolean,
  outputPath?: string,
  format?: string,
): void {
  const report = staged
    ? scanSpecificFiles(projectDir, getStagedFiles(projectDir))
    : scanProject(projectDir);

  if (outputPath) {
    const fmt = (format ?? 'json') as ReportFormat;
    writeReport(report, fmt, outputPath);
    console.log(`  ${pc.green('✓')} Report written to ${outputPath} (${fmt})`);
    return;
  }

  if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }
  if (format) { console.log(formatReport(report, format as ReportFormat)); return; }

  const modeLabel = staged ? ' (staged files)' : '';
  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init scan'))} — Code Anti-Pattern Scanner${modeLabel}`);
  console.log('');
  console.log(`  ${pc.dim('Project:')} ${projectDir}`);
  console.log(`  ${pc.dim('Files scanned:')} ${report.filesScanned}`);
  console.log(`  ${pc.dim('Findings:')} ${report.findings.length}`);
  console.log('');

  if (report.summary.length > 0) {
    console.log(`  ${pc.bold('By category:')}`);
    for (const cat of report.summary) {
      const critLabel = cat.critical > 0 ? pc.red(` (${cat.critical} critical)`) : '';
      const highLabel = cat.high > 0 ? pc.yellow(` (${cat.high} high)`) : '';
      console.log(
        `    ${cat.category} ${pc.dim('─'.repeat(20 - cat.category.length))} ${cat.count} findings${critLabel}${highLabel}`,
      );
    }
    console.log('');
  }

  if (report.topFiles.length > 0) {
    console.log(`  ${pc.bold('Top files:')}`);
    for (const f of report.topFiles.slice(0, 5)) {
      console.log(`    ${severityColor(f.worst)} ${f.file} (${f.count} findings)`);
    }
    console.log('');
  }

  const top = report.findings.slice(0, 15);
  if (top.length > 0) {
    console.log(`  ${pc.bold('Top findings:')}`);
    for (const f of top) {
      console.log(`    ${severityColor(f.severity)} ${pc.dim(`${f.file}:${f.line}`)} ${f.message}`);
    }
    if (report.findings.length > 15) {
      console.log(pc.dim(`    ... and ${report.findings.length - 15} more`));
    }
    console.log('');
  }

  console.log(pc.bold(`  Grade: ${gradeColor(report.grade)}  Score: ${report.score}/100`));
  console.log('');
  if (report.grade !== 'A') {
    console.log(`  ${pc.dim('Add governance:')} npx forge-ai-init --migrate`);
    console.log('');
  }
}
