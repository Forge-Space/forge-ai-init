import pc from 'picocolors';
import { runGate } from '../gate.js';
import type { Severity } from '../scanner.js';
import { gradeColor, severityColor } from './ui.js';

function formatGateMarkdown(result: ReturnType<typeof runGate>): string {
  const icon = result.passed ? '✅' : '❌';
  const label = result.passed ? 'PASSED' : 'FAILED';
  const lines: string[] = [];
  lines.push('# forge-ai-init Quality Gate');
  lines.push('');
  lines.push(
    `${icon} **${label}** — Score **${result.score}**/100 (${result.grade}) · Threshold ${result.threshold} · Phase ${result.phase}`,
  );
  lines.push('');
  if (result.violations.length > 0) {
    lines.push('## Blocking Violations');
    lines.push('');
    lines.push('| Rule | Severity | Count |');
    lines.push('|------|----------|------:|');
    for (const v of result.violations) {
      lines.push(`| ${v.rule} | ${v.severity} | ${v.count} |`);
    }
    lines.push('');
  }
  lines.push(result.summary);
  lines.push('');
  return lines.join('\n');
}

export function runGateCommand(
  projectDir: string,
  phase?: string,
  threshold?: number,
  asJson?: boolean,
  format?: string,
): void {
  const result = runGate(projectDir, phase, threshold);

  if (asJson || format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  if (format === 'markdown') {
    console.log(formatGateMarkdown(result));
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init gate'))} — Quality Gate`);
  console.log('');
  const passLabel = result.passed ? pc.green(pc.bold('PASSED')) : pc.red(pc.bold('FAILED'));
  console.log(`  ${passLabel}`);
  console.log(
    `  ${pc.dim('Score:')} ${result.score}/100  ${pc.dim('Threshold:')} ${result.threshold}  ${pc.dim('Phase:')} ${result.phase}`,
  );
  console.log(`  ${pc.dim('Grade:')} ${gradeColor(result.grade)}`);
  console.log('');

  if (result.violations.length > 0) {
    console.log(`  ${pc.bold('Blocking violations:')}`);
    for (const v of result.violations) {
      console.log(`    ${pc.red('✗')} ${v.rule} (${severityColor(v.severity as Severity)}) × ${v.count}`);
    }
    console.log('');
  }

  console.log(`  ${result.summary}`);
  console.log('');
  process.exitCode = result.passed ? 0 : 1;
}
