import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BuildTool, CIProvider, PackageManager, TestFramework } from '../types.js';
import { readJson } from '../shared.js';
import { fileExists } from './utils.js';

export function detectBuildTool(
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

export function detectPackageManager(dir: string): PackageManager {
  if (fileExists(dir, 'bun.lockb', 'bun.lock')) return 'bun';
  if (fileExists(dir, 'pnpm-lock.yaml')) return 'pnpm';
  if (fileExists(dir, 'yarn.lock')) return 'yarn';
  if (fileExists(dir, 'package-lock.json')) return 'npm';
  if (fileExists(dir, 'Cargo.lock')) return 'cargo';
  if (fileExists(dir, 'go.sum')) return 'go';
  if (fileExists(dir, 'poetry.lock', 'Pipfile.lock', 'requirements.txt'))
    return 'pip';
  return 'npm';
}

export function detectTestFramework(
  dir: string,
  deps: Record<string, string>,
): TestFramework | undefined {
  if (deps['vitest']) return 'vitest';
  if (deps['jest']) return 'jest';
  if (deps['mocha']) return 'mocha';
  if (deps['playwright'] || deps['@playwright/test']) return 'playwright';
  if (deps['cypress']) return 'cypress';

  if (fileExists(dir, 'pytest.ini', 'pyproject.toml', 'setup.cfg')) {
    const pyproject = join(dir, 'pyproject.toml');
    if (existsSync(pyproject)) {
      const content = readFileSync(pyproject, 'utf-8');
      if (content.includes('[tool.pytest')) return 'pytest';
    }
  }

  return undefined;
}

export function detectMonorepo(dir: string): boolean {
  if (fileExists(dir, 'turbo.json', 'nx.json', 'lerna.json')) return true;
  if (fileExists(dir, 'pnpm-workspace.yaml')) return true;

  const pkg = readJson(join(dir, 'package.json'));
  if (pkg && pkg['workspaces']) return true;

  return false;
}

export function detectCIProvider(dir: string): CIProvider | undefined {
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
