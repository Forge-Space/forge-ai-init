import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BuildTool,
  CIProvider,
  DetectedStack,
  Framework,
  Language,
  PackageManager,
  TestFramework,
} from './types.js';
import { readJson } from './shared.js';

function fileExists(dir: string, ...names: string[]): boolean {
  return names.some((n) => existsSync(join(dir, n)));
}

function collectWorkspaceDeps(
  dir: string,
  pkg: Record<string, unknown> | null,
): Record<string, string> {
  const rootDeps: Record<string, string> = {
    ...((pkg?.['dependencies'] ?? {}) as Record<string, string>),
    ...((pkg?.['devDependencies'] ?? {}) as Record<string, string>),
  };

  const workspaces = pkg?.['workspaces'];
  if (!workspaces) return rootDeps;

  const patterns: string[] = Array.isArray(workspaces)
    ? workspaces
    : (workspaces as Record<string, string[]>)?.['packages'] ?? [];

  for (const pattern of patterns) {
    const wsDir = join(dir, pattern.replace('/*', ''));
    if (!existsSync(wsDir)) continue;
    try {
      const entries = readdirSync(wsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const wsPkg = readJson(
          join(wsDir, entry.name, 'package.json'),
        );
        if (wsPkg) {
          Object.assign(
            rootDeps,
            (wsPkg['dependencies'] ?? {}) as Record<string, string>,
            (wsPkg['devDependencies'] ?? {}) as Record<
              string,
              string
            >,
          );
        }
      }
    } catch {
      // ignore
    }
  }

  return rootDeps;
}

function findFileRecursive(
  dir: string,
  name: string,
  maxDepth = 2,
): boolean {
  if (existsSync(join(dir, name))) return true;
  if (maxDepth <= 0) return false;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      ) {
        if (findFileRecursive(join(dir, entry.name), name, maxDepth - 1))
          return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function hasKotlinSources(dir: string): boolean {
  const srcDir = join(dir, 'src');
  if (!existsSync(srcDir)) return false;
  try {
    const entries = readdirSync(srcDir, { withFileTypes: true, recursive: true });
    return entries.some((e) => e.name.endsWith('.kt') || e.name.endsWith('.kts'));
  } catch {
    return false;
  }
}

function detectLanguage(dir: string): Language {
  if (fileExists(dir, 'tsconfig.json', 'tsconfig.base.json'))
    return 'typescript';
  if (findFileRecursive(dir, 'tsconfig.json', 2)) return 'typescript';
  if (fileExists(dir, 'Cargo.toml')) return 'rust';
  if (fileExists(dir, 'go.mod')) return 'go';
  if (fileExists(dir, 'build.gradle.kts') && hasKotlinSources(dir))
    return 'kotlin';
  if (fileExists(dir, 'pom.xml', 'build.gradle', 'build.gradle.kts'))
    return 'java';
  if (
    fileExists(
      dir,
      'pyproject.toml',
      'setup.py',
      'setup.cfg',
      'requirements.txt',
    )
  )
    return 'python';
  if (fileExists(dir, 'package.json')) return 'javascript';
  return 'javascript';
}

function detectFramework(
  dir: string,
  deps: Record<string, string>,
): Framework | undefined {
  if (deps['next']) return 'nextjs';
  if (deps['remix'] || deps['@remix-run/node']) return 'remix';
  if (deps['astro']) return 'astro';
  if (deps['nuxt']) return 'nuxt';
  if (deps['@sveltejs/kit']) return 'sveltekit';
  if (deps['svelte']) return 'svelte';
  if (deps['vue']) return 'vue';
  if (deps['@nestjs/core']) return 'nestjs';
  if (deps['express']) return 'express';
  if (deps['react'] || deps['react-dom']) return 'react';

  if (fileExists(dir, 'pyproject.toml', 'requirements.txt')) {
    const content = existsSync(join(dir, 'pyproject.toml'))
      ? readFileSync(join(dir, 'pyproject.toml'), 'utf-8')
      : existsSync(join(dir, 'requirements.txt'))
        ? readFileSync(join(dir, 'requirements.txt'), 'utf-8')
        : '';
    if (content.includes('fastapi')) return 'fastapi';
    if (content.includes('django')) return 'django';
    if (content.includes('flask')) return 'flask';
  }

  if (fileExists(dir, 'pom.xml')) {
    const pom = readFileSync(join(dir, 'pom.xml'), 'utf-8');
    if (pom.includes('spring-boot')) return 'spring';
  }

  return undefined;
}

function detectBuildTool(
  deps: Record<string, string>,
): BuildTool | undefined {
  if (deps['vite']) return 'vite';
  if (deps['webpack'] || deps['webpack-cli']) return 'webpack';
  if (deps['esbuild']) return 'esbuild';
  if (deps['tsup']) return 'tsup';
  if (deps['rollup']) return 'rollup';
  if (deps['parcel']) return 'parcel';
  return undefined;
}

function detectPackageManager(dir: string): PackageManager {
  if (fileExists(dir, 'bun.lockb', 'bun.lock')) return 'bun';
  if (fileExists(dir, 'pnpm-lock.yaml')) return 'pnpm';
  if (fileExists(dir, 'yarn.lock')) return 'yarn';
  if (fileExists(dir, 'package-lock.json')) return 'npm';
  if (fileExists(dir, 'Cargo.lock')) return 'cargo';
  if (fileExists(dir, 'go.sum')) return 'go';
  if (
    fileExists(dir, 'poetry.lock', 'Pipfile.lock', 'requirements.txt')
  )
    return 'pip';
  return 'npm';
}

function detectTestFramework(
  dir: string,
  deps: Record<string, string>,
): TestFramework | undefined {
  if (deps['vitest']) return 'vitest';
  if (deps['jest']) return 'jest';
  if (deps['mocha']) return 'mocha';
  if (deps['playwright'] || deps['@playwright/test'])
    return 'playwright';
  if (deps['cypress']) return 'cypress';

  if (
    fileExists(dir, 'pytest.ini', 'pyproject.toml', 'setup.cfg')
  ) {
    const pyproject = join(dir, 'pyproject.toml');
    if (existsSync(pyproject)) {
      const content = readFileSync(pyproject, 'utf-8');
      if (content.includes('[tool.pytest')) return 'pytest';
    }
  }

  return undefined;
}

function detectMonorepo(dir: string): boolean {
  if (fileExists(dir, 'turbo.json', 'nx.json', 'lerna.json'))
    return true;
  if (fileExists(dir, 'pnpm-workspace.yaml')) return true;

  const pkg = readJson(join(dir, 'package.json'));
  if (pkg && pkg['workspaces']) return true;

  return false;
}

function detectCIProvider(dir: string): CIProvider | undefined {
  if (existsSync(join(dir, '.github', 'workflows'))) {
    try {
      const files = readdirSync(join(dir, '.github', 'workflows'));
      if (files.some((f) => f.endsWith('.yml') || f.endsWith('.yaml')))
        return 'github-actions';
    } catch {
      // ignore
    }
  }
  if (fileExists(dir, '.gitlab-ci.yml')) return 'gitlab-ci';
  if (fileExists(dir, '.circleci/config.yml')) return 'circleci';
  if (fileExists(dir, 'Jenkinsfile')) return 'jenkins';
  return undefined;
}

function detectCommands(
  pkg: Record<string, unknown> | null,
  language: Language,
  packageManager: PackageManager,
): {
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
  devCommand?: string;
} {
  const scripts = (pkg?.['scripts'] ?? {}) as Record<string, string>;
  const run =
    packageManager === 'pnpm'
      ? 'pnpm'
      : packageManager === 'yarn'
        ? 'yarn'
        : packageManager === 'bun'
          ? 'bun run'
          : 'npm run';

  const result: {
    buildCommand?: string;
    testCommand?: string;
    lintCommand?: string;
    devCommand?: string;
  } = {};

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
