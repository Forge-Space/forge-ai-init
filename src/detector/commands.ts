import type { Language, PackageManager } from '../types.js';

export interface DetectedCommands {
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
  devCommand?: string;
}

export function detectCommands(
  pkg: Record<string, unknown> | null,
  language: Language,
  packageManager: PackageManager,
): DetectedCommands {
  const scripts = (pkg?.['scripts'] ?? {}) as Record<string, string>;
  const run =
    packageManager === 'pnpm'
      ? 'pnpm'
      : packageManager === 'yarn'
        ? 'yarn'
        : packageManager === 'bun'
          ? 'bun run'
          : 'npm run';

  const result: DetectedCommands = {};

  if (scripts['build']) result.buildCommand = `${run} build`;
  if (scripts['test']) result.testCommand = `${run} test`;
  if (scripts['lint']) result.lintCommand = `${run} lint`;
  if (scripts['dev'] || scripts['start'])
    result.devCommand = `${run} ${scripts['dev'] ? 'dev' : 'start'}`;

  if (language === 'python') {
    result.testCommand ??= 'pytest';
    result.lintCommand ??= 'ruff check';
  }

  if (language === 'go') {
    result.buildCommand ??= 'go build ./...';
    result.testCommand ??= 'go test ./...';
    result.lintCommand ??= 'golangci-lint run';
  }

  if (language === 'rust') {
    result.buildCommand ??= 'cargo build';
    result.testCommand ??= 'cargo test';
    result.lintCommand ??= 'cargo clippy';
  }

  return result;
}
