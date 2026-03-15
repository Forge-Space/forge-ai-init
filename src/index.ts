import { resolve } from 'node:path';
import pc from 'picocolors';
import { detectStack } from './detector.js';
import { resolveTenantContext } from './tenant-profile.js';

import { parseArgs, parseTier, parseTools, printUsage } from './commands/parse.js';
import { runCheckCommand } from './commands/check.js';
import { runScanCommand, runUpdateCommand, runWatchCommand } from './commands/scan.js';
import { runAssessCommand } from './commands/assess.js';
import { runBaselineCommand } from './commands/baseline.js';
import { runPlanCommand } from './commands/plan.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runGateCommand } from './commands/gate.js';
import { runScaffoldCommand } from './commands/scaffold.js';
import { runMigratePlanCommand } from './commands/migrate-plan.js';
import { runCiCommand } from './commands/ci.js';
import { runDiffCommand } from './commands/diff.js';
import { runTestAutogenCommand } from './commands/test-autogen.js';
import { runInteractive, runNonInteractive } from './commands/init.js';

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts['help']) { printUsage(); return; }

  const projectDir = resolve((opts['dir'] as string) ?? '.');
  try {
    resolveTenantContext(projectDir, opts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(pc.red(`  ${message}`));
    process.exit(1);
  }

  const force = opts['force'] === true;
  const dryRun = opts['dry-run'] === true;
  const migrate = opts['migrate'] === true;
  const interactive = !opts['yes'] && !opts['tier'] && !opts['tools'];
  const stack = detectStack(projectDir);

  switch (opts['command'] as string | undefined) {
    case 'check':
      runCheckCommand(projectDir, stack); return;
    case 'migrate':
      if (opts['watch']) { runWatchCommand(projectDir); return; }
      runScanCommand(projectDir, opts['json'] === true, opts['staged'] === true,
        opts['output'] as string | undefined, opts['format'] as string | undefined);
      return;
    case 'assess':
      runAssessCommand(projectDir, stack, opts['json'] === true,
        opts['output'] as string | undefined, opts['format'] as string | undefined);
      return;
    case 'update':
      runUpdateCommand(projectDir, stack, opts); return;
    case 'baseline':
      runBaselineCommand(projectDir, opts['compare'] === true); return;
    case 'plan':
      runPlanCommand(projectDir, stack, opts['json'] === true); return;
    case 'doctor':
      runDoctorCommand(projectDir, stack, opts['json'] === true); return;
    case 'gate': {
      const t = opts['threshold'] ? Number(opts['threshold']) : undefined;
      runGateCommand(projectDir, opts['phase'] as string|undefined, t,
        opts['json'] === true, opts['format'] as string|undefined);
      return;
    }
    case 'test-autogen':
      runTestAutogenCommand(projectDir, stack, opts); return;
    case 'migrate-plan':
      runMigratePlanCommand(projectDir, stack, opts['json'] === true); return;
    case 'scaffold':
      runScaffoldCommand(projectDir, opts['template'] as string|undefined,
        opts['name'] as string|undefined, opts['json'] === true);
      return;
    case 'ci': {
      const t = opts['threshold'] ? Number(opts['threshold']) : undefined;
      runCiCommand(projectDir, opts['provider'] as string|undefined,
        opts['phase'] as string|undefined, t, false, opts['json'] === true);
      return;
    }
    case 'diff':
      runDiffCommand(projectDir, opts['base'] as string|undefined,
        opts['staged'] === true, opts['json'] === true);
      return;
    default:
      if (interactive) {
        await runInteractive(projectDir, stack, force, dryRun);
      } else {
        runNonInteractive(projectDir, stack,
          parseTier(opts['tier'] as string|undefined),
          parseTools(opts['tools'] as string|undefined),
          force, dryRun, migrate);
      }
  }
}

main();
