import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { detectStack } from '../src/detector.js';
import { detectLanguage } from '../src/detector/language.js';
import { detectFramework } from '../src/detector/framework.js';
import {
  detectBuildTool,
  detectPackageManager,
  detectTestFramework,
  detectCIProvider,
} from '../src/detector/tooling.js';
import {
  collectWorkspaceDeps,
  findFileRecursive,
  hasKotlinSources,
} from '../src/detector/utils.js';

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

// ─── language.ts branch coverage ────────────────────────────────────────────

describe('detectLanguage — branch coverage', () => {
  it('detects kotlin when build.gradle.kts present AND .kt source exists', () => {
    const dir = join(
      tmpdir(),
      `forge-lang-kotlin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'build.gradle.kts'), '');
      // hasKotlinSources scans src/ recursively for *.kt files
      mkdirSync(join(dir, 'src', 'main', 'kotlin'), { recursive: true });
      writeFileSync(join(dir, 'src', 'main', 'kotlin', 'App.kt'), '');
      expect(detectLanguage(dir)).toBe('kotlin');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to java when build.gradle.kts present but no .kt sources', () => {
    const dir = join(
      tmpdir(),
      `forge-lang-java-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'build.gradle.kts'), '');
      // no src/ directory → hasKotlinSources returns false → falls to java branch
      expect(detectLanguage(dir)).toBe('java');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns javascript when no markers are present (no package.json)', () => {
    const dir = join(
      tmpdir(),
      `forge-lang-js-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      // empty dir — hits the final `return 'javascript'` fallback
      expect(detectLanguage(dir)).toBe('javascript');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── framework.ts branch coverage ───────────────────────────────────────────

describe('detectFramework — branch coverage', () => {
  it('detects nuxt from nuxt dependency', () => {
    expect(detectFramework('/unused', { nuxt: '^3.0.0' })).toBe('nuxt');
  });

  it('detects sveltekit from @sveltejs/kit dependency', () => {
    expect(detectFramework('/unused', { '@sveltejs/kit': '^2.0.0' })).toBe(
      'sveltekit',
    );
  });

  it('returns undefined for requirements.txt with no django/flask/fastapi', () => {
    const dir = join(
      tmpdir(),
      `forge-fw-py-plain-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'requirements.txt'), 'requests==2.31.0\nnumpy\n');
      expect(detectFramework(dir, {})).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects django from requirements.txt', () => {
    const dir = join(
      tmpdir(),
      `forge-fw-django-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'requirements.txt'), 'django==4.2.0\n');
      expect(detectFramework(dir, {})).toBe('django');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects flask from requirements.txt', () => {
    const dir = join(
      tmpdir(),
      `forge-fw-flask-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'requirements.txt'), 'flask==3.0.0\n');
      expect(detectFramework(dir, {})).toBe('flask');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── tooling.ts branch coverage ─────────────────────────────────────────────

describe('detectBuildTool — branch coverage', () => {
  it('detects webpack', () => {
    expect(detectBuildTool({ webpack: '^5.0.0' })).toBe('webpack');
  });

  it('detects webpack-cli', () => {
    expect(detectBuildTool({ 'webpack-cli': '^5.0.0' })).toBe('webpack');
  });

  it('detects esbuild', () => {
    expect(detectBuildTool({ esbuild: '^0.24.0' })).toBe('esbuild');
  });

  it('detects tsup', () => {
    expect(detectBuildTool({ tsup: '^8.0.0' })).toBe('tsup');
  });

  it('detects rollup', () => {
    expect(detectBuildTool({ rollup: '^4.0.0' })).toBe('rollup');
  });

  it('detects parcel', () => {
    expect(detectBuildTool({ parcel: '^2.0.0' })).toBe('parcel');
  });
});

describe('detectPackageManager — branch coverage', () => {
  it('detects cargo from Cargo.toml', () => {
    const dir = join(
      tmpdir(),
      `forge-pm-cargo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'Cargo.toml'), '[package]');
      writeFileSync(join(dir, 'Cargo.lock'), '');
      expect(detectPackageManager(dir)).toBe('cargo');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('detectTestFramework — branch coverage', () => {
  it('detects mocha', () => {
    expect(detectTestFramework('/unused', { mocha: '^10.0.0' })).toBe('mocha');
  });

  it('detects playwright via playwright dep', () => {
    expect(detectTestFramework('/unused', { playwright: '^1.0.0' })).toBe(
      'playwright',
    );
  });

  it('detects playwright via @playwright/test dep', () => {
    expect(
      detectTestFramework('/unused', { '@playwright/test': '^1.0.0' }),
    ).toBe('playwright');
  });

  it('detects cypress', () => {
    expect(detectTestFramework('/unused', { cypress: '^13.0.0' })).toBe(
      'cypress',
    );
  });

  it('detects pytest from pyproject.toml with [tool.pytest section', () => {
    const dir = join(
      tmpdir(),
      `forge-pytest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(
        join(dir, 'pyproject.toml'),
        '[tool.pytest.ini_options]\nminversion = "7.0"\n',
      );
      expect(detectTestFramework(dir, {})).toBe('pytest');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns undefined when pyproject.toml exists but has no pytest section', () => {
    const dir = join(
      tmpdir(),
      `forge-pytest-none-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'pyproject.toml'), '[tool.poetry]\nname = "app"\n');
      expect(detectTestFramework(dir, {})).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('detectCIProvider — branch coverage', () => {
  it('detects gitlab-ci from .gitlab-ci.yml', () => {
    const dir = join(
      tmpdir(),
      `forge-ci-gitlab-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, '.gitlab-ci.yml'), 'stages:\n  - build\n');
      expect(detectCIProvider(dir)).toBe('gitlab-ci');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects jenkins from Jenkinsfile', () => {
    const dir = join(
      tmpdir(),
      `forge-ci-jenkins-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'Jenkinsfile'), 'pipeline {}');
      expect(detectCIProvider(dir)).toBe('jenkins');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── detector/utils.ts branch coverage ───────────────────────────────────────

describe('collectWorkspaceDeps — branch coverage', () => {
  it('returns root deps and ignores unreadable workspace directory (catch line 41)', () => {
    const dir = join(
      tmpdir(),
      `forge-ws-catch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    const unreadable = join(dir, 'packages');
    mkdirSync(unreadable, { recursive: true });
    try {
      // Make the workspace dir unreadable so readdirSync throws
      chmodSync(unreadable, 0o000);
      const pkg = {
        dependencies: { lodash: '4.x' },
        workspaces: ['packages/*'],
      };
      const deps = collectWorkspaceDeps(dir, pkg);
      // Root deps still returned even when workspace dir read fails
      expect(deps['lodash']).toBe('4.x');
    } finally {
      chmodSync(unreadable, 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips files (non-directories) in workspace dir (line 31 false branch)', () => {
    const dir = join(
      tmpdir(),
      `forge-ws-file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const pkgsDir = join(dir, 'packages');
    mkdirSync(pkgsDir, { recursive: true });
    try {
      // Put a plain file in the workspace dir — should be skipped (entry.isDirectory() false)
      writeFileSync(join(pkgsDir, 'README.md'), '# readme');
      const pkg = {
        dependencies: { react: '18.x' },
        workspaces: ['packages/*'],
      };
      const deps = collectWorkspaceDeps(dir, pkg);
      // File entry skipped, root deps still returned
      expect(deps['react']).toBe('18.x');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips workspace package without package.json (line 33 false branch)', () => {
    const dir = join(
      tmpdir(),
      `forge-ws-nopkg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const pkgAppDir = join(dir, 'packages', 'app');
    mkdirSync(pkgAppDir, { recursive: true });
    try {
      // 'app' is a directory but has no package.json → readJson returns null → skipped
      const pkg = {
        dependencies: { axios: '1.x' },
        workspaces: ['packages/*'],
      };
      const deps = collectWorkspaceDeps(dir, pkg);
      expect(deps['axios']).toBe('1.x');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('merges workspace package deps when package.json exists (line 34 Object.assign)', () => {
    const dir = join(
      tmpdir(),
      `forge-ws-merge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const pkgAppDir = join(dir, 'packages', 'app');
    mkdirSync(pkgAppDir, { recursive: true });
    try {
      writeFileSync(
        join(pkgAppDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '4.x' }, devDependencies: { vitest: '1.x' } }),
      );
      const pkg = {
        dependencies: { axios: '1.x' },
        workspaces: ['packages/*'],
      };
      const deps = collectWorkspaceDeps(dir, pkg);
      expect(deps['axios']).toBe('1.x');
      expect(deps['express']).toBe('4.x');
      expect(deps['vitest']).toBe('1.x');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles workspaces as object with packages key (line 23 object format)', () => {
    const dir = join(
      tmpdir(),
      `forge-ws-obj-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const pkgAppDir = join(dir, 'packages', 'app');
    mkdirSync(pkgAppDir, { recursive: true });
    try {
      writeFileSync(
        join(pkgAppDir, 'package.json'),
        JSON.stringify({ dependencies: { lodash: '4.x' } }),
      );
      // workspaces as object with packages array (yarn classic format)
      const pkg = {
        dependencies: { axios: '1.x' },
        workspaces: { packages: ['packages/*'] },
      };
      const deps = collectWorkspaceDeps(dir, pkg as never);
      expect(deps['axios']).toBe('1.x');
      expect(deps['lodash']).toBe('4.x');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles workspaces as object without packages key (line 23 ?? [] fallback)', () => {
    const pkg = {
      dependencies: { react: '18.x' },
      workspaces: { nopkgs: [] },
    };
    const deps = collectWorkspaceDeps('/unused', pkg as never);
    // no patterns to iterate, returns root deps unchanged
    expect(deps['react']).toBe('18.x');
  });
});

describe('findFileRecursive — catch branch and recursive true return (lines 65, 68)', () => {
  it('returns false silently when readdirSync throws on the dir', () => {
    const dir = join(
      tmpdir(),
      `forge-ffr-catch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    const unreadable = join(dir, 'sub');
    mkdirSync(unreadable, { recursive: true });
    try {
      chmodSync(unreadable, 0o000);
      // target file is not directly in sub, so it recurses into sub and throws
      const found = findFileRecursive(unreadable, 'target.txt', 1);
      expect(found).toBe(false);
    } finally {
      chmodSync(unreadable, 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns true when file is found in a nested subdirectory (line 65)', () => {
    const dir = join(
      tmpdir(),
      `forge-ffr-nested-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(join(dir, 'sub', 'deep'), { recursive: true });
    try {
      writeFileSync(join(dir, 'sub', 'deep', 'target.txt'), '');
      expect(findFileRecursive(dir, 'target.txt', 2)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('hasKotlinSources — catch branch (line 81)', () => {
  it('returns false when src dir is unreadable', () => {
    const dir = join(
      tmpdir(),
      `forge-kotlin-catch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const srcDir = join(dir, 'src');
    mkdirSync(srcDir, { recursive: true });
    try {
      chmodSync(srcDir, 0o000);
      expect(hasKotlinSources(dir)).toBe(false);
    } finally {
      chmodSync(srcDir, 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
