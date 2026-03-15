import pc from 'picocolors';
import { generatePlan } from '../planner.js';
import type { DetectedStack } from '../types.js';
import { gradeColor } from './ui.js';

export function runPlanCommand(projectDir: string, stack: DetectedStack, asJson: boolean): void {
  const plan = generatePlan(projectDir, stack);

  if (asJson) { console.log(JSON.stringify(plan, null, 2)); return; }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init plan'))} — Architecture Plan`);
  console.log('');
  console.log(`  ${pc.dim('Score:')} ${pc.bold(String(plan.scan.score))}/100 (${gradeColor(plan.scan.grade)})`);
  console.log(`  ${pc.dim('Files:')} ${plan.structure.sourceFiles} source, ${plan.structure.testFiles} test (${plan.structure.testRatio}% ratio)`);
  console.log(`  ${pc.dim('Entry points:')} ${plan.structure.entryPoints.join(', ') || 'none detected'}`);
  console.log('');

  if (plan.risks.length > 0) {
    console.log(`  ${pc.bold('Risks:')}`);
    for (const r of plan.risks) {
      const sev =
        r.severity === 'critical' ? pc.bgRed(pc.white(` ${r.severity} `)) :
        r.severity === 'high' ? pc.red(r.severity) :
        r.severity === 'medium' ? pc.yellow(r.severity) : pc.dim(r.severity);
      console.log(`    ${sev} ${pc.bold(r.area)}: ${r.description}`);
      console.log(`      ${pc.dim('→')} ${r.mitigation}`);
    }
    console.log('');
  }

  if (plan.recommendations.length > 0) {
    console.log(`  ${pc.bold('Recommendations:')}`);
    for (const rec of plan.recommendations) {
      const pri =
        rec.priority === 'must' ? pc.red('[MUST]') :
        rec.priority === 'should' ? pc.yellow('[SHOULD]') : pc.dim('[COULD]');
      console.log(`    ${pri} ${rec.title}`);
      console.log(`      ${pc.dim(rec.description)}`);
    }
    console.log('');
  }

  if (plan.adrs.length > 0) {
    console.log(`  ${pc.bold('Suggested ADRs:')}`);
    for (const adr of plan.adrs) {
      console.log(`    ${pc.cyan(adr.title)}`);
      console.log(`      ${pc.dim(adr.decision)}`);
    }
    console.log('');
  }

  console.log(`  ${pc.bold('Scaling Strategy:')}`);
  console.log(`    ${plan.scalingStrategy}`);
  console.log('');

  console.log(`  ${pc.bold('Quality Gates:')}`);
  for (const gate of plan.qualityGates) {
    console.log(`    ${pc.cyan(gate.phase)} (>=${gate.threshold}%)`);
    for (const check of gate.checks) console.log(`      ${pc.dim('•')} ${check}`);
  }
  console.log('');
}
