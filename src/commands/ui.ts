import pc from 'picocolors';
import type { DetectedStack } from '../types.js';
import type { CheckStatus } from '../checker.js';
import type { Severity } from '../scanner.js';
import type { HealthCheck } from '../doctor.js';

export function formatStack(stack: DetectedStack): string {
  const lines: string[] = [];

  lines.push(
    `  Language:     ${pc.cyan(stack.language)}${stack.framework ? ` (${pc.cyan(stack.framework)})` : ''}`,
  );

  if (stack.buildTool)
    lines.push(`  Build:        ${pc.cyan(stack.buildTool)}`);

  lines.push(`  Package Mgr:  ${pc.cyan(stack.packageManager)}`);
  lines.push(
    `  Monorepo:     ${stack.monorepo ? pc.yellow('Yes') : 'No'}`,
  );

  if (stack.testFramework)
    lines.push(`  Tests:        ${pc.cyan(stack.testFramework)}`);

  lines.push(
    `  Linting:      ${stack.hasLinting ? pc.green('Yes') : pc.red('No')}`,
  );
  lines.push(
    `  Type Check:   ${stack.hasTypeChecking ? pc.green('Yes') : pc.red('No')}`,
  );
  lines.push(
    `  Formatting:   ${stack.hasFormatting ? pc.green('Yes') : pc.red('No')}`,
  );
  lines.push(
    `  CI/CD:        ${stack.hasCi ? pc.green(stack.ciProvider ?? 'Yes') : pc.red('No')}`,
  );

  if (stack.buildCommand)
    lines.push(`  Build cmd:    ${pc.dim(stack.buildCommand)}`);
  if (stack.testCommand)
    lines.push(`  Test cmd:     ${pc.dim(stack.testCommand)}`);
  if (stack.lintCommand)
    lines.push(`  Lint cmd:     ${pc.dim(stack.lintCommand)}`);

  return lines.join('\n');
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return pc.green(grade);
    case 'B':
      return pc.cyan(grade);
    case 'C':
      return pc.yellow(grade);
    case 'D':
      return pc.red(grade);
    default:
      return pc.bgRed(pc.white(` ${grade} `));
  }
}

export function severityColor(s: Severity): string {
  switch (s) {
    case 'critical':
      return pc.bgRed(pc.white(` ${s} `));
    case 'high':
      return pc.red(s);
    case 'medium':
      return pc.yellow(s);
    case 'low':
      return pc.dim(s);
  }
}

export function statusIcon(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return pc.green('✓');
    case 'fail':
      return pc.red('✗');
    case 'warn':
      return pc.yellow('△');
  }
}

export function healthIcon(status: HealthCheck['status']): string {
  switch (status) {
    case 'pass':
      return pc.green('✓');
    case 'fail':
      return pc.red('✗');
    case 'warn':
      return pc.yellow('△');
  }
}

export function formatScoreDelta(n: number): string {
  if (n > 0) return pc.green(`+${n}`);
  if (n < 0) return pc.red(`${n}`);
  return pc.dim('0');
}

export function formatFindingDelta(n: number): string {
  if (n > 0) return pc.red(`+${n}`);
  if (n < 0) return pc.green(`${n}`);
  return pc.dim('0');
}
