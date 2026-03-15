import pc from 'picocolors';
import { analyzeDiff } from '../diff-analyzer.js';
import type { Severity } from '../scanner.js';
import { severityColor } from './ui.js';

export function runDiffCommand(
  projectDir: string,
  base?: string,
  staged?: boolean,
  asJson?: boolean,
): void {
  const result = analyzeDiff(projectDir, { base, staged });

  if (asJson) { console.log(JSON.stringify(result, null, 2)); return; }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init diff'))} — PR Quality Delta`);
  console.log('');

  if (result.changedFiles.length === 0) {
    console.log(`  ${pc.dim('No changed files detected.')}`);
    console.log('');
    return;
  }

  const arrow = result.improved ? pc.green('▲') : pc.red('▼');
  const deltaStr =
    result.delta > 0 ? pc.green(`+${result.delta}`) :
    result.delta < 0 ? pc.red(`${result.delta}`) : pc.dim('0');

  console.log(`  ${pc.dim('Files changed:')} ${result.changedFiles.length}`);
  console.log(`  ${pc.dim('Score:')} ${result.beforeScore} → ${result.afterScore} (${arrow} ${deltaStr})`);
  console.log('');

  if (result.newFindings.length > 0) {
    console.log(`  ${pc.bold('Findings in changed files')} (${result.newFindings.length}):`);
    for (const f of result.newFindings.slice(0, 15)) {
      console.log(`    ${severityColor(f.severity as Severity)} ${pc.dim(f.file)} ${f.message}`);
    }
    if (result.newFindings.length > 15) {
      console.log(pc.dim(`    ... and ${result.newFindings.length - 15} more`));
    }
    console.log('');
  }

  console.log(`  ${result.summary}`);
  console.log('');
}
