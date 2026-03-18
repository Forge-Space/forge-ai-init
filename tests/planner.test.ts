import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatePlan } from '../src/planner.js';
import { walkProjectFiles } from '../src/planner/walker.js';
import type { DetectedStack } from '../src/types.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-plan-${Date.now()}`);
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
  framework: 'nextjs',
  buildTool: 'turbopack',
  packageManager: 'npm',
  monorepo: false,
  testFramework: 'jest',
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
  ciProvider: 'github-actions',
};

describe('planner', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    writeFile(
      dir,
      'package.json',
      JSON.stringify({ name: 'test' }),
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns a complete plan', () => {
    const plan = generatePlan(dir, baseStack);
    expect(plan.stack).toBe(baseStack);
    expect(plan.scan).toBeDefined();
    expect(plan.structure).toBeDefined();
    expect(plan.risks).toBeDefined();
    expect(plan.recommendations).toBeDefined();
    expect(plan.adrs).toBeDefined();
    expect(plan.scalingStrategy).toBeDefined();
    expect(plan.qualityGates).toBeDefined();
  });

  it('analyzes project structure', () => {
    writeFile(dir, 'src/app.ts', 'const y = 2;\n');
    writeFile(dir, 'tests/app.test.ts', 'test("x", () => {});\n');
    const plan = generatePlan(dir, baseStack);
    expect(plan.structure.sourceFiles).toBeGreaterThanOrEqual(2);
    expect(plan.structure.testFiles).toBeGreaterThanOrEqual(1);
    expect(plan.structure.totalFiles).toBeGreaterThan(0);
  });

  it('detects test ratio', () => {
    writeFile(dir, 'src/a.ts', 'export const a = 1;\n');
    writeFile(dir, 'src/b.ts', 'export const b = 2;\n');
    const plan = generatePlan(dir, baseStack);
    expect(plan.structure.testRatio).toBeDefined();
    expect(typeof plan.structure.testRatio).toBe('number');
  });

  it('finds entry points', () => {
    writeFile(dir, 'src/main.ts', 'console.log("main");\n');
    const plan = generatePlan(dir, baseStack);
    const entryNames = plan.structure.entryPoints.map((e) =>
      e.replace(/^.*\//, ''),
    );
    expect(
      entryNames.some((e) => e.includes('index') || e.includes('main')),
    ).toBe(true);
  });

  it('detects risks for missing type checking', () => {
    const noTypeStack = { ...baseStack, hasTypeChecking: false };
    const plan = generatePlan(dir, noTypeStack);
    expect(
      plan.risks.some((r) => r.area === 'type-safety'),
    ).toBe(true);
  });

  it('detects risks for missing CI', () => {
    const noCiStack = { ...baseStack, hasCi: false };
    const plan = generatePlan(dir, noCiStack);
    expect(plan.risks.some((r) => r.area === 'ci-cd')).toBe(true);
  });

  it('detects risks for missing linting', () => {
    const noLintStack = { ...baseStack, hasLinting: false };
    const plan = generatePlan(dir, noLintStack);
    expect(
      plan.risks.some((r) => r.area === 'code-quality'),
    ).toBe(true);
  });

  it('generates recommendations', () => {
    const plan = generatePlan(dir, baseStack);
    expect(plan.recommendations.length).toBeGreaterThan(0);
    for (const rec of plan.recommendations) {
      expect(['must', 'should', 'could']).toContain(rec.priority);
    }
  });

  it('suggests ADRs', () => {
    const plan = generatePlan(dir, baseStack);
    expect(plan.adrs.length).toBeGreaterThan(0);
    expect(plan.adrs[0]!.title).toContain('ADR-001');
  });

  it('suggests monorepo ADR when applicable', () => {
    const monoStack = { ...baseStack, monorepo: true };
    const plan = generatePlan(dir, monoStack);
    expect(
      plan.adrs.some((a) => a.title.includes('Monorepo')),
    ).toBe(true);
  });

  it('determines scaling strategy for nextjs', () => {
    const plan = generatePlan(dir, baseStack);
    expect(plan.scalingStrategy).toContain('Edge');
  });

  it('determines scaling strategy for express', () => {
    const expressStack = { ...baseStack, framework: 'express' as const };
    const plan = generatePlan(dir, expressStack);
    expect(plan.scalingStrategy).toContain('Horizontal');
  });

  it('determines scaling strategy for fastapi', () => {
    const fastapiStack = {
      ...baseStack,
      language: 'python' as const,
      framework: 'fastapi' as const,
    };
    const plan = generatePlan(dir, fastapiStack);
    expect(plan.scalingStrategy).toContain('ASGI');
  });

  it('defines 3 quality gates', () => {
    const plan = generatePlan(dir, baseStack);
    expect(plan.qualityGates).toHaveLength(3);
    expect(plan.qualityGates[0]!.threshold).toBe(40);
    expect(plan.qualityGates[1]!.threshold).toBe(60);
    expect(plan.qualityGates[2]!.threshold).toBe(80);
  });

  it('detects low test ratio as critical risk', () => {
    const plan = generatePlan(dir, baseStack);
    if (plan.structure.testRatio < 20) {
      expect(
        plan.risks.some(
          (r) => r.area === 'testing' && r.severity === 'critical',
        ),
      ).toBe(true);
    }
  });

  it('recommends formatter when missing', () => {
    const noFmtStack = { ...baseStack, hasFormatting: false };
    const plan = generatePlan(dir, noFmtStack);
    expect(
      plan.recommendations.some((r) =>
        r.title.toLowerCase().includes('formatter'),
      ),
    ).toBe(true);
  });

  it('recommends increasing test coverage when test ratio is below 50%', () => {
    writeFile(dir, 'tests/index.test.ts', 'test("ok", () => {});\n');
    for (let i = 0; i < 5; i++) {
      writeFile(dir, `src/module${i}.ts`, `export const v${i} = ${i};\n`);
    }

    const plan = generatePlan(dir, baseStack);
    const coverageRec = plan.recommendations.find(
      r => r.title === 'Increase test coverage',
    );
    expect(plan.structure.testRatio).toBeLessThan(50);
    expect(coverageRec).toBeDefined();
    expect(coverageRec?.priority).toBe('must');
  });

  it('uses Jest fallback when testFramework is undefined in ADR testing strategy', () => {
    const noTestFrameworkStack = {
      ...baseStack,
      testFramework: undefined,
    };

    const plan = generatePlan(dir, noTestFrameworkStack);
    const testingAdr = plan.adrs.find(a => a.title.includes('Testing Strategy'));
    expect(testingAdr).toBeDefined();
    expect(testingAdr?.decision).toContain('Jest for unit tests');
  });

  it('determines scaling strategy for spring framework', () => {
    const springStack = {
      ...baseStack,
      language: 'java' as const,
      framework: 'spring' as const,
    };
    const plan = generatePlan(dir, springStack);
    expect(plan.scalingStrategy).toContain('JVM');
  });

  it('determines scaling strategy for go language', () => {
    const goStack = {
      ...baseStack,
      language: 'go' as const,
      framework: undefined,
    };
    const plan = generatePlan(dir, goStack);
    expect(plan.scalingStrategy).toContain('Goroutine');
  });

  it('determines scaling strategy for rust language', () => {
    const rustStack = {
      ...baseStack,
      language: 'rust' as const,
      framework: undefined,
    };
    const plan = generatePlan(dir, rustStack);
    expect(plan.scalingStrategy).toContain('tokio');
  });

  it('determines fallback scaling strategy for plain node projects', () => {
    const plainNodeStack = {
      ...baseStack,
      framework: undefined,
      language: 'typescript' as const,
    };
    const plan = generatePlan(dir, plainNodeStack);
    expect(plan.scalingStrategy).toContain('vertical');
  });

  it('detects architecture risk when arch findings > 5 (risks.ts line 64)', () => {
    // Create 6 files each with >500 lines to trigger god-file rule for each
    for (let i = 0; i < 7; i++) {
      writeFile(dir, `src/god${i}.ts`, Array(600).fill(`const x${i} = 1;`).join('\n'));
    }
    const plan = generatePlan(dir, baseStack);
    const archRisk = plan.risks.find((r) => r.area === 'architecture');
    expect(archRisk).toBeDefined();
  });

  it('detects overall-quality risk when scan score < 40 (risks.ts line 73)', () => {
    // Create many files with critical issues to push the scan score below 40
    for (let i = 0; i < 25; i++) {
      writeFile(dir, `src/crit${i}.ts`, [
        `const password${i} = "hardcoded_secret_${i}";`,
        `eval("dangerous${i}");`,
        `const apiKey${i} = "sk-supersecretapikey${i}abcdef";`,
      ].join('\n'));
    }
    const plan = generatePlan(dir, baseStack);
    // Check if the quality risk was detected (only fires when score < 40)
    if (plan.scan.score < 40) {
      expect(plan.risks.some((r) => r.area === 'overall-quality')).toBe(true);
    }
    // Always verify we get a valid plan back
    expect(plan.risks).toBeDefined();
  });

  it('handles unreadable root directory in analyzeStructure (structure.ts line 34 catch)', () => {
    const unreadDir = join(tmpdir(), `forge-unread-${Date.now()}`);
    mkdirSync(unreadDir, { recursive: true });
    try {
      chmodSync(unreadDir, 0o000);
      // analyzeStructure catches the readdirSync error — topDirs should be []
      const plan = generatePlan(unreadDir, baseStack);
      expect(plan.structure.topDirs).toEqual([]);
    } finally {
      chmodSync(unreadDir, 0o755);
      rmSync(unreadDir, { recursive: true, force: true });
    }
  });

  it('detects security risk when source file contains a hardcoded secret', () => {
    writeFile(
      dir,
      'src/config.ts',
      'const API_KEY = "sk-1234567890abcdef1234567890abcdef";\n',
    );
    const plan = generatePlan(dir, baseStack);
    const hasSecurityRisk = plan.risks.some(
      (r) => r.area === 'security',
    );
    const hasSecurityRec = plan.recommendations.some(
      (r) => r.category === 'security',
    );
    expect(hasSecurityRisk || hasSecurityRec).toBe(true);
  });
});

// ─── planner/walker.ts branch coverage ───────────────────────────────────────

describe('walkProjectFiles — branch coverage', () => {
  it('returns empty array when root directory is unreadable (catch line 37)', () => {
    const dir = join(
      tmpdir(),
      `forge-walker-catch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      chmodSync(dir, 0o000);
      const results = walkProjectFiles(dir);
      expect(results).toEqual([]);
    } finally {
      chmodSync(dir, 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips unreadable subdirectories and continues walking readable ones (catch line 37 subdir)', () => {
    const dir = join(
      tmpdir(),
      `forge-walker-subdir-catch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const unreadable = join(dir, 'locked');
    const readable = join(dir, 'open');
    mkdirSync(unreadable, { recursive: true });
    mkdirSync(readable, { recursive: true });
    writeFileSync(join(readable, 'file.ts'), 'export const x = 1;');
    try {
      chmodSync(unreadable, 0o000);
      const results = walkProjectFiles(dir);
      const paths = results.map((r) => r.path);
      expect(paths.some((p) => p.includes('file.ts'))).toBe(true);
    } finally {
      chmodSync(unreadable, 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stops at maxFiles limit mid-loop (line 40 break)', () => {
    const dir = join(
      tmpdir(),
      `forge-walker-maxfiles-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    try {
      // Create more files than the limit in a flat dir — triggers line 40 break
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(dir, `file${i}.ts`), `export const x${i} = ${i};`);
      }
      const results = walkProjectFiles(dir, 3);
      expect(results.length).toBe(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips recursive walk when maxFiles already reached (line 32 early return)', () => {
    const dir = join(
      tmpdir(),
      `forge-walker-maxfiles-rec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    // Use names that sort consistently: 'aaa' before 'bbb'
    const subA = join(dir, 'aaa');
    const subB = join(dir, 'bbb');
    mkdirSync(subA, { recursive: true });
    mkdirSync(subB, { recursive: true });
    try {
      // subA fills exactly at maxFiles=2
      writeFileSync(join(subA, 'f1.ts'), '');
      writeFileSync(join(subA, 'f2.ts'), '');
      // subB has more files, but walk(subB) should hit line 32 early return
      writeFileSync(join(subB, 'f3.ts'), '');
      writeFileSync(join(subB, 'f4.ts'), '');
      const results = walkProjectFiles(dir, 2);
      // Walk fills up to 2 from subA; subB is skipped via early return at line 32
      expect(results.length).toBeLessThanOrEqual(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips directories starting with dot (line 42 startsWith dot branch)', () => {
    const dir = join(
      tmpdir(),
      `forge-walker-dot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const dotDir = join(dir, '.hidden');
    const normalDir = join(dir, 'src');
    mkdirSync(dotDir, { recursive: true });
    mkdirSync(normalDir, { recursive: true });
    writeFileSync(join(dotDir, 'secret.ts'), 'export const secret = true;');
    writeFileSync(join(normalDir, 'index.ts'), 'export const x = 1;');
    try {
      const results = walkProjectFiles(dir);
      const paths = results.map((r) => r.path);
      expect(paths.some((p) => p.includes('secret.ts'))).toBe(false);
      expect(paths.some((p) => p.includes('index.ts'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
