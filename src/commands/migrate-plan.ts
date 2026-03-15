import pc from 'picocolors';
import { analyzeMigration } from '../migrate-analyzer.js';
import type { DetectedStack } from '../types.js';
import { severityColor } from './ui.js';
import type { Severity } from '../scanner.js';

export function runMigratePlanCommand(
  projectDir: string,
  stack: DetectedStack,
  asJson: boolean,
): void {
  const plan = analyzeMigration(projectDir, stack);

  if (asJson) { console.log(JSON.stringify(plan, null, 2)); return; }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init migrate-plan'))} — Migration Roadmap`);
  console.log('');
  console.log(`  ${pc.bold('Strategy:')} ${pc.cyan(plan.strategy.name)}`);
  console.log(`    ${plan.strategy.description}`);
  console.log(`    ${pc.dim('For:')} ${plan.strategy.applicableTo}`);
  console.log(`    ${pc.dim('Estimated effort:')} ${pc.yellow(plan.estimatedEffort)}`);
  console.log('');

  if (plan.boundaries.length > 0) {
    console.log(`  ${pc.bold('Strangler Boundaries')} (${plan.boundaries.length} modules):`);
    for (const b of plan.boundaries) {
      const cplx =
        b.complexity === 'high' ? pc.red(b.complexity) :
        b.complexity === 'medium' ? pc.yellow(b.complexity) : pc.green(b.complexity);
      console.log(`    ${cplx} ${b.module} [${b.type}]`);
      console.log(`      ${pc.dim(b.reason)}`);
    }
    console.log('');
  }

  if (plan.dependencyRisks.length > 0) {
    console.log(`  ${pc.bold('Dependency Risks')} (${plan.dependencyRisks.length}):`);
    for (const d of plan.dependencyRisks) {
      console.log(`    ${severityColor(d.severity as Severity)} ${d.name}@${d.currentVersion}`);
      console.log(`      ${pc.dim('→')} ${d.recommendation}`);
    }
    console.log('');
  }

  if (plan.typingPlan.length > 0) {
    console.log(`  ${pc.bold('Typing Plan')} (${plan.typingPlan.length} files):`);
    for (const t of plan.typingPlan.slice(0, 10)) {
      const pri =
        t.priority === 'high' ? pc.red('[HIGH]') :
        t.priority === 'medium' ? pc.yellow('[MED]') : pc.dim('[LOW]');
      console.log(`    ${pri} ${t.file} (${t.estimatedLines} lines)`);
      console.log(`      ${pc.dim(t.reason)}`);
    }
    if (plan.typingPlan.length > 10) {
      console.log(pc.dim(`    ... and ${plan.typingPlan.length - 10} more files`));
    }
    console.log('');
  }

  console.log(`  ${pc.bold('Migration Phases:')}`);
  for (const phase of plan.phases) {
    console.log(`  ${pc.cyan(phase.name)}`);
    console.log(`    ${phase.description}`);
    for (const task of phase.tasks) console.log(`    ${pc.dim('•')} ${task}`);
    console.log(`    ${pc.dim('Gate:')} ${phase.gate}`);
    console.log('');
  }
}
