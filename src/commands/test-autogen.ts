import pc from 'picocolors';
import { runTestAutogen, summarizeTestAutogen } from '../test-autogen.js';
import type { DetectedStack } from '../types.js';

export function runTestAutogenCommand(
  projectDir: string,
  stack: DetectedStack,
  opts: Record<string, string | boolean>,
): void {
  const write = opts['write'] === true;
  const check = opts['check'] === true || !write;
  const result = runTestAutogen(projectDir, stack, {
    staged: opts['staged'] === true,
    write,
    check,
    baseRef: opts['base'] as string | undefined,
  });

  if (opts['json'] === true) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  console.log('');
  console.log(`  ${pc.bold(pc.magenta('forge-ai-init test-autogen'))} — Required Test Generation`);
  console.log('');
  console.log(`  ${pc.dim('Stack:')} ${result.stack}`);
  console.log(`  ${pc.dim('Changed files:')} ${result.changedFiles.length}`);
  console.log(`  ${pc.dim('Requirements:')} ${result.requirements.length}`);
  console.log(`  ${pc.dim('Created:')} ${result.created.length}`);
  console.log(`  ${pc.dim('Missing:')} ${result.missing.length}`);
  console.log(`  ${pc.dim('Summary:')} ${summarizeTestAutogen(result)}`);
  console.log('');

  if (result.bypassed) {
    console.log(`  ${pc.yellow('Bypassed')} until ${result.bypassExpiresAt} — ${result.bypassReason}`);
    console.log('');
  }

  if (result.created.length > 0) {
    console.log(`  ${pc.bold('Created tests:')}`);
    for (const file of result.created.slice(0, 20)) console.log(`    ${pc.green('+')} ${file}`);
    if (result.created.length > 20) console.log(`    ${pc.dim(`... and ${result.created.length - 20} more`)}`);
    console.log('');
  }

  if (result.missing.length > 0) {
    console.log(`  ${pc.bold('Missing required tests:')}`);
    for (const file of result.missing.slice(0, 20)) console.log(`    ${pc.red('✗')} ${file}`);
    if (result.missing.length > 20) console.log(`    ${pc.dim(`... and ${result.missing.length - 20} more`)}`);
    console.log('');
  }

  process.exitCode = result.passed ? 0 : 1;
}
