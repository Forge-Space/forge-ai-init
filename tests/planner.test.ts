import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatePlan } from '../src/planner.js';
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
