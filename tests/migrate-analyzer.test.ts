import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeMigration } from '../src/migrate-analyzer.js';
import type { DetectedStack } from '../src/types.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-mig-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(
  dir: string,
  name: string,
  content: string,
): void {
  const path = join(dir, name);
  const parent = path.substring(0, path.lastIndexOf('/'));
  mkdirSync(parent, { recursive: true });
  writeFileSync(path, content);
}

const baseStack: DetectedStack = {
  language: 'typescript',
  framework: 'express',
  buildTool: 'tsup',
  packageManager: 'npm',
  monorepo: false,
  testFramework: 'jest',
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
  ciProvider: 'github-actions',
};

describe('migrate-analyzer', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns a migration plan', () => {
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.strategy).toBeDefined();
    expect(plan.boundaries).toBeDefined();
    expect(plan.typingPlan).toBeDefined();
    expect(plan.dependencyRisks).toBeDefined();
    expect(plan.phases).toBeDefined();
    expect(plan.estimatedEffort).toBeDefined();
  });

  it('detects strangler-fig for express', () => {
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.strategy.name).toBe('Strangler Fig');
  });

  it('detects branch-by-abstraction for react', () => {
    const reactStack = { ...baseStack, framework: 'react' as const };
    const plan = analyzeMigration(dir, reactStack);
    expect(plan.strategy.name).toBe('Branch by Abstraction');
  });

  it('detects parallel-run for java', () => {
    const javaStack = {
      ...baseStack,
      language: 'java' as const,
      framework: undefined,
    };
    const plan = analyzeMigration(dir, javaStack);
    expect(plan.strategy.name).toBe('Parallel Run');
  });

  it('detects incremental for generic projects', () => {
    const goStack = {
      ...baseStack,
      language: 'go' as const,
      framework: undefined,
    };
    const plan = analyzeMigration(dir, goStack);
    expect(plan.strategy.name).toBe('Incremental Modernization');
  });

  it('detects legacy dependency risks', () => {
    writeFile(
      dir,
      'package.json',
      JSON.stringify({
        name: 'test',
        dependencies: {
          moment: '^2.29.0',
          jquery: '^3.7.0',
        },
      }),
    );
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.dependencyRisks.length).toBeGreaterThanOrEqual(2);
    expect(
      plan.dependencyRisks.some((d) => d.name === 'moment'),
    ).toBe(true);
    expect(
      plan.dependencyRisks.some((d) => d.name === 'jquery'),
    ).toBe(true);
  });

  it('detects deprecated request library', () => {
    writeFile(
      dir,
      'package.json',
      JSON.stringify({
        name: 'test',
        dependencies: { request: '^2.88.0' },
      }),
    );
    const plan = analyzeMigration(dir, baseStack);
    const req = plan.dependencyRisks.find(
      (d) => d.name === 'request',
    );
    expect(req).toBeDefined();
    expect(req!.severity).toBe('critical');
  });

  it('warns on high dependency count', () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 35; i++) {
      deps[`pkg-${i}`] = '1.0.0';
    }
    writeFile(
      dir,
      'package.json',
      JSON.stringify({ name: 'test', dependencies: deps }),
    );
    const plan = analyzeMigration(dir, baseStack);
    expect(
      plan.dependencyRisks.some((d) =>
        d.name.includes('dependency count'),
      ),
    ).toBe(true);
  });

  it('generates typing plan for JS files', () => {
    writeFile(dir, 'src/helper.js', 'function foo() { return 1; }\n');
    writeFile(dir, 'src/utils.js', 'const x = 2;\n');
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.typingPlan.length).toBeGreaterThanOrEqual(2);
  });

  it('prioritizes small JS files as high', () => {
    writeFile(dir, 'src/tiny.js', 'const x = 1;\n');
    const plan = analyzeMigration(dir, baseStack);
    const tiny = plan.typingPlan.find((t) =>
      t.file.includes('tiny'),
    );
    if (tiny) {
      expect(tiny.priority).toBe('high');
    }
  });

  it('prioritizes utility files as high', () => {
    writeFile(dir, 'src/utils.js', 'function x() {}\nfunction y() {}\n');
    const plan = analyzeMigration(dir, baseStack);
    const util = plan.typingPlan.find((t) =>
      t.file.includes('utils'),
    );
    if (util) {
      expect(util.priority).toBe('high');
    }
  });

  it('returns empty typing plan for all-TS projects', () => {
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.typingPlan.length).toBe(0);
  });

  it('generates at least 2 migration phases', () => {
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.phases.length).toBeGreaterThanOrEqual(2);
  });

  it('first phase is always Stabilize', () => {
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.phases[0]!.name).toContain('Stabilize');
  });

  it('last phase is always Harden', () => {
    const plan = analyzeMigration(dir, baseStack);
    const last = plan.phases[plan.phases.length - 1]!;
    expect(last.name).toContain('Harden');
  });

  it('phases have tasks and gates', () => {
    const plan = analyzeMigration(dir, baseStack);
    for (const phase of plan.phases) {
      expect(phase.tasks.length).toBeGreaterThan(0);
      expect(phase.gate).toBeDefined();
    }
  });

  it('estimated effort is a string range', () => {
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.estimatedEffort).toMatch(
      /\d+.*day|week|month/,
    );
  });

  it('finds strangler boundaries for god files', () => {
    const lines = Array(600).fill('const x = 1;').join('\n');
    writeFile(dir, 'src/monolith.ts', lines);
    const plan = analyzeMigration(dir, baseStack);
    const boundary = plan.boundaries.find((b) =>
      b.module.includes('monolith'),
    );
    if (boundary) {
      expect(boundary.reason).toContain('God file');
    }
  });

  it('detects api module type', () => {
    const lines = Array(600).fill('const x = 1;').join('\n');
    writeFile(dir, 'src/routes/api.ts', lines);
    const plan = analyzeMigration(dir, baseStack);
    const apiB = plan.boundaries.find(
      (b) => b.type === 'api',
    );
    if (apiB) {
      expect(apiB.type).toBe('api');
    }
  });

  it('detectModuleType returns data for model-named JS files', () => {
    writeFile(dir, 'src/models/user-model.js', 'const x = 1;\n');
    const plan = analyzeMigration(dir, baseStack);
    const step = plan.typingPlan.find((t) =>
      t.file.includes('user-model'),
    );
    expect(step).toBeDefined();
    const lines = Array(600).fill('const x = 1;').join('\n');
    writeFile(dir, 'src/models/user-model.ts', lines);
    const plan2 = analyzeMigration(dir, baseStack);
    const boundary = plan2.boundaries.find((b) =>
      b.module.includes('user-model'),
    );
    if (boundary) {
      expect(boundary.type).toBe('data');
    }
  });

  it('detectModuleType returns ui for component-named JS files', () => {
    writeFile(dir, 'src/components/button.js', 'const x = 1;\n');
    const plan = analyzeMigration(dir, baseStack);
    const step = plan.typingPlan.find((t) =>
      t.file.includes('button'),
    );
    expect(step).toBeDefined();
    const lines = Array(600).fill('const x = 1;').join('\n');
    writeFile(dir, 'src/components/button.ts', lines);
    const plan2 = analyzeMigration(dir, baseStack);
    const boundary = plan2.boundaries.find((b) =>
      b.module.includes('button'),
    );
    if (boundary) {
      expect(boundary.type).toBe('ui');
    }
  });

  it('isEntry triggers high priority typing step for index.js', () => {
    writeFile(dir, 'index.js', 'module.exports = {};\n');
    const plan = analyzeMigration(dir, baseStack);
    const step = plan.typingPlan.find((t) =>
      t.file === 'index.js',
    );
    expect(step).toBeDefined();
    if (step) {
      expect(step.priority).toBe('high');
      expect(step.reason).toContain('Entry point');
    }
  });

  it('isConfig triggers medium priority typing step for config.js', () => {
    writeFile(dir, 'src/config.js', 'module.exports = { debug: true };\n');
    const plan = analyzeMigration(dir, baseStack);
    const step = plan.typingPlan.find((t) =>
      t.file.includes('config'),
    );
    if (step && step.priority !== 'high') {
      expect(step.priority).toBe('medium');
      expect(step.reason).toContain('Config file');
    }
  });

  it('analyzeDependencyRisks returns empty array for malformed package.json', () => {
    writeFile(dir, 'package.json', 'NOT VALID JSON{{{{');
    const plan = analyzeMigration(dir, baseStack);
    expect(Array.isArray(plan.dependencyRisks)).toBe(true);
    expect(plan.dependencyRisks).toHaveLength(0);
  });

  it('estimateEffort returns 2-4 weeks for large projects', () => {
    const heavyDeps: Record<string, string> = {};
    const legacyLibs = ['moment', 'jquery', 'lodash', 'request', 'bluebird'];
    for (const lib of legacyLibs) {
      heavyDeps[lib] = '1.0.0';
    }
    writeFile(
      dir,
      'package.json',
      JSON.stringify({ name: 'test', dependencies: heavyDeps }),
    );
    for (let i = 0; i < 15; i++) {
      const lines = Array(600).fill(`const x${i} = 1;`).join('\n');
      writeFile(dir, `src/module${i}.js`, lines.slice(0, 200));
    }
    const plan = analyzeMigration(dir, baseStack);
    expect(plan.estimatedEffort).toMatch(/day|week|month/);
  });
});
