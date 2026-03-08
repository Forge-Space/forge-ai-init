import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStack } from '../src/detector.js';

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `forge-ai-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJson(dir: string, name: string, data: unknown): void {
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2));
}

function writeFile(dir: string, path: string, content = ''): void {
  const full = join(dir, path);
  mkdirSync(full.substring(0, full.lastIndexOf('/')), {
    recursive: true,
  });
  writeFileSync(full, content);
}

describe('detectStack', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('language detection', () => {
    it('detects TypeScript from tsconfig.json', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'tsconfig.json');
      const stack = detectStack(tempDir);
      expect(stack.language).toBe('typescript');
    });

    it('detects Python from pyproject.toml', () => {
      writeFile(tempDir, 'pyproject.toml', '[tool.poetry]');
      const stack = detectStack(tempDir);
      expect(stack.language).toBe('python');
    });

    it('detects Go from go.mod', () => {
      writeFile(tempDir, 'go.mod', 'module example.com/app');
      const stack = detectStack(tempDir);
      expect(stack.language).toBe('go');
    });

    it('detects Rust from Cargo.toml', () => {
      writeFile(tempDir, 'Cargo.toml', '[package]');
      const stack = detectStack(tempDir);
      expect(stack.language).toBe('rust');
    });

    it('detects Java from pom.xml', () => {
      writeFile(tempDir, 'pom.xml', '<project></project>');
      const stack = detectStack(tempDir);
      expect(stack.language).toBe('java');
    });

    it('defaults to JavaScript with package.json', () => {
      writeJson(tempDir, 'package.json', {});
      const stack = detectStack(tempDir);
      expect(stack.language).toBe('javascript');
    });
  });

  describe('framework detection', () => {
    it('detects Next.js', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { next: '^15.0.0', react: '^19.0.0' },
      });
      writeFile(tempDir, 'tsconfig.json');
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('nextjs');
    });

    it('detects React (without Next)', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('react');
    });

    it('detects Vue', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { vue: '^3.5.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('vue');
    });

    it('detects Express', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { express: '^5.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('express');
    });

    it('detects NestJS', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { '@nestjs/core': '^11.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('nestjs');
    });

    it('detects FastAPI from pyproject.toml', () => {
      writeFile(
        tempDir,
        'pyproject.toml',
        '[project]\ndependencies = ["fastapi"]',
      );
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('fastapi');
    });

    it('detects Django from requirements.txt', () => {
      writeFile(tempDir, 'requirements.txt', 'django==5.1\n');
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('django');
    });

    it('detects Spring Boot from pom.xml', () => {
      writeFile(
        tempDir,
        'pom.xml',
        '<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>',
      );
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('spring');
    });

    it('detects Astro', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { astro: '^5.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('astro');
    });

    it('detects Remix', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { '@remix-run/node': '^2.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBe('remix');
    });

    it('returns undefined for no framework', () => {
      writeJson(tempDir, 'package.json', {
        dependencies: { lodash: '^4.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.framework).toBeUndefined();
    });
  });

  describe('package manager detection', () => {
    it('detects pnpm from pnpm-lock.yaml', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'pnpm-lock.yaml');
      const stack = detectStack(tempDir);
      expect(stack.packageManager).toBe('pnpm');
    });

    it('detects yarn from yarn.lock', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'yarn.lock');
      const stack = detectStack(tempDir);
      expect(stack.packageManager).toBe('yarn');
    });

    it('detects bun from bun.lockb', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'bun.lockb');
      const stack = detectStack(tempDir);
      expect(stack.packageManager).toBe('bun');
    });

    it('detects npm from package-lock.json', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'package-lock.json', '{}');
      const stack = detectStack(tempDir);
      expect(stack.packageManager).toBe('npm');
    });

    it('detects cargo from Cargo.lock', () => {
      writeFile(tempDir, 'Cargo.toml');
      writeFile(tempDir, 'Cargo.lock');
      const stack = detectStack(tempDir);
      expect(stack.packageManager).toBe('cargo');
    });
  });

  describe('monorepo detection', () => {
    it('detects turbo monorepo', () => {
      writeJson(tempDir, 'package.json', {});
      writeJson(tempDir, 'turbo.json', { tasks: {} });
      const stack = detectStack(tempDir);
      expect(stack.monorepo).toBe(true);
    });

    it('detects npm workspaces monorepo', () => {
      writeJson(tempDir, 'package.json', {
        workspaces: ['packages/*'],
      });
      const stack = detectStack(tempDir);
      expect(stack.monorepo).toBe(true);
    });

    it('detects pnpm workspace monorepo', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'pnpm-workspace.yaml', 'packages:\n  - packages/*');
      const stack = detectStack(tempDir);
      expect(stack.monorepo).toBe(true);
    });

    it('returns false for non-monorepo', () => {
      writeJson(tempDir, 'package.json', {});
      const stack = detectStack(tempDir);
      expect(stack.monorepo).toBe(false);
    });
  });

  describe('CI detection', () => {
    it('detects GitHub Actions', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, '.github/workflows/ci.yml', 'name: CI');
      const stack = detectStack(tempDir);
      expect(stack.hasCi).toBe(true);
      expect(stack.ciProvider).toBe('github-actions');
    });

    it('detects GitLab CI', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, '.gitlab-ci.yml', 'stages:');
      const stack = detectStack(tempDir);
      expect(stack.hasCi).toBe(true);
      expect(stack.ciProvider).toBe('gitlab-ci');
    });

    it('detects CircleCI', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, '.circleci/config.yml', 'version: 2.1');
      const stack = detectStack(tempDir);
      expect(stack.hasCi).toBe(true);
      expect(stack.ciProvider).toBe('circleci');
    });

    it('returns false when no CI found', () => {
      writeJson(tempDir, 'package.json', {});
      const stack = detectStack(tempDir);
      expect(stack.hasCi).toBe(false);
      expect(stack.ciProvider).toBeUndefined();
    });
  });

  describe('tooling detection', () => {
    it('detects Jest', () => {
      writeJson(tempDir, 'package.json', {
        devDependencies: { jest: '^30.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.testFramework).toBe('jest');
    });

    it('detects Vitest', () => {
      writeJson(tempDir, 'package.json', {
        devDependencies: { vitest: '^3.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.testFramework).toBe('vitest');
    });

    it('detects ESLint flat config', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, 'eslint.config.js');
      const stack = detectStack(tempDir);
      expect(stack.hasLinting).toBe(true);
    });

    it('detects Prettier', () => {
      writeJson(tempDir, 'package.json', {});
      writeFile(tempDir, '.prettierrc');
      const stack = detectStack(tempDir);
      expect(stack.hasFormatting).toBe(true);
    });

    it('detects Vite build tool', () => {
      writeJson(tempDir, 'package.json', {
        devDependencies: { vite: '^6.0.0' },
      });
      const stack = detectStack(tempDir);
      expect(stack.buildTool).toBe('vite');
    });
  });

  describe('command detection', () => {
    it('detects npm scripts', () => {
      writeJson(tempDir, 'package.json', {
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/',
          dev: 'tsx watch src/index.ts',
        },
      });
      const stack = detectStack(tempDir);
      expect(stack.buildCommand).toBe('npm run build');
      expect(stack.testCommand).toBe('npm run test');
      expect(stack.lintCommand).toBe('npm run lint');
      expect(stack.devCommand).toBe('npm run dev');
    });

    it('uses pnpm prefix when pnpm detected', () => {
      writeJson(tempDir, 'package.json', {
        scripts: { build: 'tsc', test: 'vitest' },
      });
      writeFile(tempDir, 'pnpm-lock.yaml');
      const stack = detectStack(tempDir);
      expect(stack.buildCommand).toBe('pnpm build');
      expect(stack.testCommand).toBe('pnpm test');
    });

    it('provides Python defaults', () => {
      writeFile(
        tempDir,
        'pyproject.toml',
        '[project]\nname = "app"',
      );
      const stack = detectStack(tempDir);
      expect(stack.testCommand).toBe('pytest');
      expect(stack.lintCommand).toBe('ruff check');
    });

    it('provides Go defaults', () => {
      writeFile(tempDir, 'go.mod', 'module example.com/app');
      const stack = detectStack(tempDir);
      expect(stack.buildCommand).toBe('go build ./...');
      expect(stack.testCommand).toBe('go test ./...');
    });

    it('provides Rust defaults', () => {
      writeFile(tempDir, 'Cargo.toml', '[package]');
      const stack = detectStack(tempDir);
      expect(stack.buildCommand).toBe('cargo build');
      expect(stack.testCommand).toBe('cargo test');
    });
  });

  describe('full stack detection', () => {
    it('detects a Next.js + TypeScript + Turbo project', () => {
      writeJson(tempDir, 'package.json', {
        workspaces: ['apps/*', 'packages/*'],
        scripts: {
          build: 'turbo build',
          test: 'turbo test',
          lint: 'turbo lint',
          dev: 'turbo dev',
        },
        dependencies: {
          next: '^15.0.0',
          react: '^19.0.0',
        },
        devDependencies: {
          typescript: '^5.7.0',
          jest: '^30.0.0',
          vite: '^6.0.0',
        },
      });
      writeFile(tempDir, 'tsconfig.json');
      writeFile(tempDir, 'turbo.json', '{}');
      writeFile(tempDir, 'eslint.config.mjs');
      writeFile(tempDir, '.prettierrc');
      writeFile(tempDir, 'package-lock.json', '{}');
      writeFile(tempDir, '.github/workflows/ci.yml', 'name: CI');

      const stack = detectStack(tempDir);

      expect(stack.language).toBe('typescript');
      expect(stack.framework).toBe('nextjs');
      expect(stack.buildTool).toBe('vite');
      expect(stack.packageManager).toBe('npm');
      expect(stack.monorepo).toBe(true);
      expect(stack.testFramework).toBe('jest');
      expect(stack.hasLinting).toBe(true);
      expect(stack.hasTypeChecking).toBe(true);
      expect(stack.hasFormatting).toBe(true);
      expect(stack.hasCi).toBe(true);
      expect(stack.ciProvider).toBe('github-actions');
    });
  });
});
