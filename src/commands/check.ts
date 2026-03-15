import pc from 'picocolors';
import { runAudit } from '../checker.js';
import type { DetectedStack } from '../types.js';
import { formatStack, gradeColor, statusIcon } from './ui.js';

export function runCheckCommand(
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
    const catChecks = report.checks.filter((c) => c.category === cat.category);
    for (const check of catChecks) {
      console.log(
        `    ${statusIcon(check.status)} ${check.name}: ${pc.dim(check.detail)}`,
      );
    }
    console.log('');
  }

  console.log(pc.bold(`  Grade: ${gradeColor(report.grade)}  Score: ${report.score}/100`));
  console.log('');

  const failures = report.checks.filter((c) => c.status === 'fail');
  const warnings = report.checks.filter((c) => c.status === 'warn');

  if (failures.length > 0) {
    console.log(`  ${pc.red(`${failures.length} critical issues:`)}`);
    for (const f of failures) console.log(`    ${pc.red('→')} ${f.detail}`);
    console.log('');
  }

  if (warnings.length > 0 && failures.length === 0) {
    console.log(`  ${pc.yellow(`${warnings.length} improvements available`)}`);
    console.log('');
  }

  if (report.grade === 'A') {
    console.log(`  ${pc.green('Excellent!')} Your project has strong AI governance.`);
  } else {
    console.log(`  ${pc.dim('Fix issues:')} npx forge-ai-init --force`);
    if (report.score < 60) {
      console.log(`  ${pc.dim('Migration:')} npx forge-ai-init --migrate --force`);
    }
  }
  console.log('');
}
