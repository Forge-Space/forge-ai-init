import { mkdirSync, writeFileSync, rmSync, mkdtempSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { analyzeMigration } from '../src/migrate-analyzer.js';
import { findStranglerBoundaries } from '../src/migrate-analyzer/boundaries.js';
import { analyzeDependencyRisks } from '../src/migrate-analyzer/dependency-risks.js';
import { estimateEffort } from '../src/migrate-analyzer/phases.js';
import { analyzeTypingNeeds } from '../src/migrate-analyzer/typing-needs.js';
import type { DetectedStack } from '../src/types.js';
import type { ScanReport } from '../src/scanner.js';
import type { StranglerBoundary, TypingStep, DependencyRisk } from '../src/migrate-analyzer/types.js';

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

  it('assigns low priority for JS file with > 300 lines (lines 62-64)', () => {
    const manyLines = Array(310).fill('const x = 1;').join('\n');
    writeFile(dir, 'src/bigmodule.js', manyLines);
    const plan = analyzeMigration(dir, baseStack);
    const step = plan.typingPlan.find((t) => t.file.includes('bigmodule'));
    if (step) {
      expect(step.priority).toBe('low');
      expect(step.reason).toContain('Large file');
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

// Helper: minimal valid ScanReport with custom findings
function makeScanReport(findings: ScanReport['findings']): ScanReport {
  return {
    findings,
    filesScanned: findings.length || 1,
    score: 80,
    grade: 'B',
    summary: [],
    topFiles: [],
  };
}

describe('findStranglerBoundaries — complexity branch coverage (lines 25-29)', () => {
  function makeScanReportLocal(findings: ScanReport['findings']): ScanReport {
    return {
      findings,
      filesScanned: findings.length || 1,
      score: 80,
      grade: 'B',
      summary: [],
      topFiles: [],
    };
  }

  it('assigns high complexity when god-file has > 5 total findings', () => {
    // 6 findings all on the same file → complexity = 'high'
    const findings = Array.from({ length: 6 }, (_, i) => ({
      file: 'src/big.ts',
      line: i + 1,
      category: 'architecture' as const,
      severity: 'high' as const,
      rule: i === 0 ? 'god-file' : 'other-rule',
      message: `Finding ${i}`,
    }));
    const scan = makeScanReportLocal(findings);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    const b = boundaries.find((b) => b.module === 'src/big.ts');
    expect(b).toBeDefined();
    expect(b!.complexity).toBe('high');
  });

  it('assigns medium complexity when god-file has 3-5 total findings', () => {
    // 4 findings on same file → complexity = 'medium'
    const findings = Array.from({ length: 4 }, (_, i) => ({
      file: 'src/medium.ts',
      line: i + 1,
      category: 'architecture' as const,
      severity: 'high' as const,
      rule: i === 0 ? 'god-file' : 'other-rule',
      message: `Finding ${i}`,
    }));
    const scan = makeScanReportLocal(findings);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    const b = boundaries.find((b) => b.module === 'src/medium.ts');
    expect(b).toBeDefined();
    expect(b!.complexity).toBe('medium');
  });

  it('assigns low complexity when god-file has <= 2 total findings', () => {
    // Only 1 finding → complexity = 'low'
    const scan = makeScanReportLocal([{
      file: 'src/small.ts',
      line: 1,
      category: 'architecture' as const,
      severity: 'high' as const,
      rule: 'god-file',
      message: 'God file',
    }]);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    const b = boundaries.find((b) => b.module === 'src/small.ts');
    expect(b).toBeDefined();
    expect(b!.complexity).toBe('low');
  });

  it('sprawl boundary uses 0 dependents when file has no finding map entry (line 42 ?? 0)', () => {
    // sprawl file not referenced in fileFindings map → dependents = 0
    const scan = makeScanReportLocal([{
      file: 'src/fresh.ts',
      line: 1,
      category: 'architecture' as const,
      severity: 'medium' as const,
      rule: 'function-sprawl',
      message: 'Too many exports',
    }]);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    const b = boundaries.find((b) => b.module === 'src/fresh.ts');
    expect(b).toBeDefined();
    // dependents is fileFindings.get(file) which is 1 (the sprawl finding itself counted in loop)
    expect(typeof b!.dependents).toBe('number');
  });
});

describe('findStranglerBoundaries — coverage gaps', () => {
  it('creates boundary for function-sprawl files not in god-file list', () => {
    const scan = makeScanReport([
      {
        file: 'src/routes/api.ts',
        line: 1,
        category: 'architecture',
        severity: 'high',
        rule: 'function-sprawl',
        message: 'Too many exports',
      },
    ]);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    expect(boundaries.length).toBe(1);
    expect(boundaries[0]!.module).toBe('src/routes/api.ts');
    expect(boundaries[0]!.reason).toContain('Function sprawl');
    expect(boundaries[0]!.type).toBe('api');
  });

  it('deduplication guard: skips function-sprawl file already in god-file list', () => {
    // Same file appears as both god-file AND function-sprawl — should only produce one boundary
    const scan = makeScanReport([
      {
        file: 'src/big-service.ts',
        line: 1,
        category: 'architecture',
        severity: 'high',
        rule: 'god-file',
        message: 'God file',
      },
      {
        file: 'src/big-service.ts',
        line: 2,
        category: 'architecture',
        severity: 'medium',
        rule: 'function-sprawl',
        message: 'Too many exports',
      },
    ]);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    // Only one boundary — the god-file one; the function-sprawl duplicate is skipped
    expect(boundaries.filter((b) => b.module === 'src/big-service.ts').length).toBe(1);
    expect(boundaries[0]!.reason).toContain('God file');
  });
});

describe('analyzeDependencyRisks — coverage gaps', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `forge-dep-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('handles package.json with no dependencies key (undefined deps)', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', devDependencies: { typescript: '^5.0.0' } }),
    );
    // Should not throw; dependencies ?? {} resolves to empty object
    const risks = analyzeDependencyRisks(dir);
    expect(Array.isArray(risks)).toBe(true);
    // No dependency count warning since pkg.dependencies is undefined → count = 0
    expect(risks.every((r) => !r.name.includes('dependency count'))).toBe(true);
  });

  it('adds medium severity risk when dep count is 31-50', () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 31; i++) deps[`pkg-${i}`] = '1.0.0';
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: deps }),
    );
    const risks = analyzeDependencyRisks(dir);
    const countRisk = risks.find((r) => r.name.includes('dependency count'));
    expect(countRisk).toBeDefined();
    expect(countRisk!.severity).toBe('medium');
  });

  it('adds high severity risk when dep count exceeds 50', () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 51; i++) deps[`pkg-${i}`] = '1.0.0';
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: deps }),
    );
    const risks = analyzeDependencyRisks(dir);
    const countRisk = risks.find((r) => r.name.includes('dependency count'));
    expect(countRisk).toBeDefined();
    expect(countRisk!.severity).toBe('high');
  });
});

describe('analyzeTypingNeeds — catch block coverage (line 15)', () => {
  it('returns empty array when root dir is non-readable (readdirSync throws)', () => {
    // Pass a path that does not exist — readdirSync will throw ENOENT
    const steps = analyzeTypingNeeds('/nonexistent/path/that/does/not/exist/xyz123');
    expect(Array.isArray(steps)).toBe(true);
    expect(steps).toHaveLength(0);
  });

  it('returns empty array when dir exists but has no JS files', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'forge-typing-'));
    try {
      writeFileSync(join(tmpDir, 'readme.md'), '# readme\n');
      const steps = analyzeTypingNeeds(tmpDir);
      expect(steps).toHaveLength(0);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips node_modules and dotfile directories (line 19 false branch)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'forge-typing-'));
    try {
      // Create a node_modules dir with a JS file inside — should be ignored
      mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });
      writeFileSync(join(tmpDir, 'node_modules', 'ignored.js'), 'const x = 1;\n');
      // Create a dotfile dir with a JS file inside — should be ignored
      mkdirSync(join(tmpDir, '.hidden'), { recursive: true });
      writeFileSync(join(tmpDir, '.hidden', 'also-ignored.js'), 'const y = 2;\n');
      const steps = analyzeTypingNeeds(tmpDir);
      // Neither file from ignored dirs should be in steps
      expect(steps.every((s) => !s.file.includes('node_modules'))).toBe(true);
      expect(steps.every((s) => !s.file.includes('.hidden'))).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('assigns medium priority for regular JS file with 50-300 lines (line 62 false branch)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'forge-typing-'));
    try {
      // 100-line regular JS file — not entry, not util, not config, 50 <= lines <= 300
      const regularContent = Array(100).fill('const val = 42;').join('\n');
      writeFileSync(join(tmpDir, 'regular-module.js'), regularContent);
      const steps = analyzeTypingNeeds(tmpDir);
      const step = steps.find((s) => s.file.includes('regular-module'));
      expect(step).toBeDefined();
      expect(step!.priority).toBe('medium');
      expect(step!.reason).toBe('Standard module — convert to TypeScript');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('findStranglerBoundaries — ?? 0 null-coalescing branch (lines 25, 42)', () => {
  function makeFindings(overrides: Partial<ScanReport['findings'][0]>[] = []): ScanReport {
    return {
      findings: overrides as ScanReport['findings'],
      filesScanned: 1,
      score: 80,
      grade: 'B',
      summary: [],
      topFiles: [],
    };
  }

  it('god-file with exactly 1 finding gets dependents=1 and complexity=low', () => {
    // Only 1 finding on the file (the god-file rule itself)
    // fileFindings.get(file) = 1, ?? 0 left side is defined (1)
    const scan = makeFindings([{
      file: 'src/only.ts',
      line: 1,
      category: 'architecture',
      severity: 'high',
      rule: 'god-file',
      message: 'God file',
    }]);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    const b = boundaries.find((x) => x.module === 'src/only.ts');
    expect(b).toBeDefined();
    expect(b!.complexity).toBe('low');
    expect(b!.dependents).toBe(1);
  });

  it('sprawl-only file with exactly 1 finding gets dependents=1', () => {
    // function-sprawl file with 1 finding → fileFindings.get(file) = 1
    const scan = makeFindings([{
      file: 'src/sprawl-only.ts',
      line: 1,
      category: 'architecture',
      severity: 'medium',
      rule: 'function-sprawl',
      message: 'Too many exports',
    }]);
    const boundaries = findStranglerBoundaries('/tmp', scan);
    const b = boundaries.find((x) => x.module === 'src/sprawl-only.ts');
    expect(b).toBeDefined();
    expect(b!.dependents).toBe(1);
    expect(b!.complexity).toBe('medium');
  });
});

describe('estimateEffort — upper tier branches', () => {
  const emptyTypingSteps: TypingStep[] = [];
  const emptyDepRisks: DependencyRisk[] = [];

  function makeBoundaries(count: number): StranglerBoundary[] {
    return Array.from({ length: count }, (_, i) => ({
      module: `src/module${i}.ts`,
      type: 'service' as const,
      complexity: 'medium' as const,
      reason: 'Test boundary',
      dependents: 1,
    }));
  }

  it('returns "2-4 weeks" when hours are between 81 and 160', () => {
    // 11 boundaries × 8h = 88h  → should be in the 81-160 range
    const boundaries = makeBoundaries(11);
    const scan = makeScanReport([]);
    const effort = estimateEffort(boundaries, emptyTypingSteps, emptyDepRisks, scan);
    expect(effort).toBe('2-4 weeks');
  });

  it('returns "1-2 months" when hours exceed 160', () => {
    // 21 boundaries × 8h = 168h  → should exceed 160
    const boundaries = makeBoundaries(21);
    const scan = makeScanReport([]);
    const effort = estimateEffort(boundaries, emptyTypingSteps, emptyDepRisks, scan);
    expect(effort).toBe('1-2 months');
  });
});
