import pc from 'picocolors';
import * as p from '@clack/prompts';
import { generate } from '../generator.js';
import type { AITool, DetectedStack, Tier } from '../types.js';
import { formatStack } from './ui.js';

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
    if (!force) p.log.info('Use --force to overwrite existing files');
  }

  if (result.created.length === 0 && result.skipped.length === 0) {
    p.log.info('Nothing to generate.');
  }
}

export async function runInteractive(
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
      { value: 'lite' as Tier, label: 'Lite', hint: 'Rules + hooks — solo dev / prototype' },
      { value: 'standard' as Tier, label: 'Standard', hint: 'Rules + skills + MCP + CI — team / production' },
      { value: 'enterprise' as Tier, label: 'Enterprise', hint: 'Full governance stack — org / regulated' },
    ],
    initialValue: 'standard' as Tier,
  });

  if (p.isCancel(tier)) { p.cancel('Cancelled.'); process.exit(0); }

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

  if (p.isCancel(tools)) { p.cancel('Cancelled.'); process.exit(0); }

  const migrate = await p.confirm({
    message: 'Legacy migration mode? (extra rules + skills for modernizing existing codebases)',
    initialValue: false,
  });

  if (p.isCancel(migrate)) { p.cancel('Cancelled.'); process.exit(0); }

  const migrateLabel = migrate ? ` + ${pc.yellow('migration')}` : '';
  const confirmed = await p.confirm({
    message: `Generate ${pc.cyan(tier)} governance for ${pc.cyan(tools.join(', '))}${migrateLabel}?`,
  });

  if (p.isCancel(confirmed) || !confirmed) { p.cancel('Cancelled.'); process.exit(0); }

  const s = p.spinner();
  s.start('Generating governance files...');
  const result = generate(stack, { projectDir, tier, tools, force, dryRun, migrate });
  s.stop('Generation complete.');

  printResult(projectDir, result, dryRun, force);

  if (!dryRun && result.created.length > 0) {
    const steps = ['1. Review CLAUDE.md and adjust rules to your conventions', '2. Commit the governance layer to your repo'];
    if (migrate) {
      steps.push('3. Run /migration-audit to assess codebase health');
      steps.push('4. Run /tech-debt-review to prioritize improvements');
    }
    p.note(steps.join('\n'), 'Next steps');
  }

  p.outro(pc.green('Your project now has AI governance.'));
}

export function runNonInteractive(
  projectDir: string,
  stack: DetectedStack,
  tier: Tier,
  tools: AITool[],
  force: boolean,
  dryRun: boolean,
  migrate: boolean,
): void {
  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init'))} — AI Governance Layer`);
  console.log('');
  console.log(`  ${pc.dim('Detected:')}`);
  console.log(formatStack(stack));
  console.log('');

  const migrateLabel = migrate ? ` | ${pc.yellow('migration mode')}` : '';
  console.log(`  ${pc.dim('Tier:')} ${pc.cyan(tier)} | ${pc.dim('Tools:')} ${pc.cyan(tools.join(', '))}${migrateLabel}`);

  if (dryRun) console.log(`  ${pc.yellow('Dry run — no files will be written')}`);
  console.log('');

  const result = generate(stack, { projectDir, tier, tools, force, dryRun, migrate });
  printResult(projectDir, result, dryRun, force);
  console.log('');

  if (!dryRun && result.created.length > 0) {
    console.log(`  ${pc.green('Done!')} Your project now has AI governance.`);
    console.log('');
    console.log(`  ${pc.dim('Next steps:')}`);
    console.log('    1. Review CLAUDE.md and adjust rules to your conventions');
    console.log('    2. Commit the governance layer to your repo');
    if (migrate) {
      console.log('    3. Run /migration-audit to assess codebase health');
      console.log('    4. Run /tech-debt-review to prioritize improvements');
    }
    console.log('');
  }
}
