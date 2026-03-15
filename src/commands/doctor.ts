import pc from 'picocolors';
import { runDoctor } from '../doctor.js';
import type { DetectedStack } from '../types.js';
import { gradeColor, healthIcon } from './ui.js';

export function runDoctorCommand(projectDir: string, stack: DetectedStack, asJson: boolean): void {
  const report = runDoctor(projectDir, stack);

  if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init doctor'))} — Health Check`);
  console.log('');
  console.log(pc.bold(`  Health: ${gradeColor(report.grade)}  Score: ${report.score}/100`));
  console.log(`  ${pc.dim('Coupling:')} ${report.couplingScore}/100  ${pc.dim('Complexity:')} ${report.complexityScore}/100`);

  if (report.trend) {
    const arrow =
      report.trend.direction === 'improving' ? pc.green('▲') :
      report.trend.direction === 'degrading' ? pc.red('▼') : pc.dim('→');
    console.log(`  ${pc.dim('Trend:')} ${arrow} ${report.trend.direction} (${report.trend.snapshots} snapshots)`);
  }
  console.log('');

  const categories = [...new Set(report.checks.map((c) => c.category))];
  for (const cat of categories) {
    const catChecks = report.checks.filter((c) => c.category === cat);
    const passCount = catChecks.filter((c) => c.status === 'pass').length;
    const label = `${passCount}/${catChecks.length}`;
    const colored =
      passCount === catChecks.length ? pc.green(label) :
      passCount === 0 ? pc.red(label) : pc.yellow(label);
    console.log(`  ${pc.bold(cat)} ${pc.dim('─'.repeat(22 - cat.length))} ${colored}`);
    for (const check of catChecks) {
      console.log(`    ${healthIcon(check.status)} ${check.name}: ${pc.dim(check.message)}`);
    }
    console.log('');
  }
}
