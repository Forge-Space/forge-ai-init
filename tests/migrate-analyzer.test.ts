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
});
