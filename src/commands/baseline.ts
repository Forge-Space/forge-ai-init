import pc from 'picocolors';
import { saveBaseline, compareBaseline } from '../baseline.js';
import { formatScoreDelta, formatFindingDelta } from './ui.js';

export function runBaselineCommand(projectDir: string, compare: boolean): void {
  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init baseline'))}`);
  console.log('');

  if (compare) {
    const result = compareBaseline(projectDir);
    if (!result) {
      console.log(pc.yellow('  No baseline found. Run `forge-ai-init baseline` first.'));
      console.log('');
      return;
    }

    const arrow =
      result.scoreDelta > 0 ? pc.green('▲') : result.scoreDelta < 0 ? pc.red('▼') : pc.dim('=');

    console.log(`  Score: ${result.previous.score} → ${result.current.score} (${arrow} ${formatScoreDelta(result.scoreDelta)})`);
    console.log(`  Grade: ${result.previous.grade} → ${result.current.grade}${result.gradeChanged ? pc.yellow(' changed') : ''}`);
    console.log(`  Files: ${result.previous.filesScanned} → ${result.current.filesScanned}`);
    console.log('');

    if (result.resolvedFindings > 0) {
      console.log(`  ${pc.green(`✓ ${result.resolvedFindings} findings resolved`)}`);
    }
    if (result.newFindings > 0) {
      console.log(`  ${pc.red(`✗ ${result.newFindings} new findings`)}`);
    }

    if (result.categoryChanges.length > 0) {
      console.log('');
      console.log(`  ${pc.dim('Category changes:')}`);
      for (const c of result.categoryChanges) {
        console.log(`    ${c.category.padEnd(20)} ${c.previousCount} → ${c.currentCount} (${formatFindingDelta(c.delta)})`);
      }
    }

    if (result.resolvedFindings === 0 && result.newFindings === 0) {
      console.log(`  ${pc.dim('No changes since last baseline.')}`);
    }
    console.log('');
    return;
  }

  const { entry, isFirst } = saveBaseline(projectDir);
  console.log(`  ${pc.green('✓')} Baseline saved to ${pc.dim('.forge/baseline.json')}`);
  console.log('');
  console.log(`  Score: ${pc.bold(String(entry.score))}`);
  console.log(`  Grade: ${pc.bold(entry.grade)}`);
  console.log(`  Files: ${entry.filesScanned}`);
  console.log(`  Findings: ${entry.findingCount}`);
  console.log('');

  if (isFirst) {
    console.log(`  ${pc.dim('First baseline recorded. Run with --compare after making changes.')}`);
  } else {
    console.log(`  ${pc.dim('Snapshot appended to history. Use --compare to see deltas.')}`);
  }
  console.log('');
}
