import { join } from 'node:path';
import type { DetectedStack } from '../types.js';
import { readJson } from '../shared.js';
import { collectWorkspaceDeps, fileExists, findFileRecursive } from './utils.js';
import { detectLanguage } from './language.js';
import { detectFramework } from './framework.js';
import { detectBuildTool, detectCIProvider, detectMonorepo, detectPackageManager, detectTestFramework } from './tooling.js';
import { detectCommands } from './commands.js';

export function detectStack(projectDir: string): DetectedStack {
  const pkg = readJson(join(projectDir, 'package.json'));
  const deps = collectWorkspaceDeps(projectDir, pkg);

  const language = detectLanguage(projectDir);
  const packageManager = detectPackageManager(projectDir);
  const ciProvider = detectCIProvider(projectDir);
  const commands = detectCommands(pkg, language, packageManager);

  return {
    language,
    framework: detectFramework(projectDir, deps),
    buildTool: detectBuildTool(deps),
    packageManager,
    monorepo: detectMonorepo(projectDir),
    testFramework: detectTestFramework(projectDir, deps),
    hasLinting: fileExists(
      projectDir,
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.ts',
      '.flake8',
      'ruff.toml',
      'pyproject.toml',
    ),
    hasTypeChecking:
      fileExists(
        projectDir,
        'tsconfig.json',
        'tsconfig.base.json',
        'mypy.ini',
      ) || findFileRecursive(projectDir, 'tsconfig.json', 2),
    hasFormatting: fileExists(
      projectDir,
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yml',
      'prettier.config.js',
      'prettier.config.mjs',
      '.editorconfig',
      'pyproject.toml',
    ),
    hasCi: ciProvider !== undefined,
    ciProvider,
    ...commands,
  };
}
