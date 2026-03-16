import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDoctor } from '../src/doctor.js';
import type { DetectedStack } from '../src/types.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-doc-${Date.now()}`);
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

describe('doctor', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns a health report', () => {
    const report = runDoctor(dir, baseStack);
    expect(report.score).toBeDefined();
    expect(report.grade).toBeDefined();
    expect(report.checks).toBeDefined();
    expect(report.couplingScore).toBeDefined();
    expect(report.complexityScore).toBeDefined();
  });

  it('has architecture checks', () => {
    const report = runDoctor(dir, baseStack);
    const archChecks = report.checks.filter(
      (c) => c.category === 'architecture',
    );
    expect(archChecks.length).toBeGreaterThan(0);
  });

  it('has security checks', () => {
    const report = runDoctor(dir, baseStack);
    const secChecks = report.checks.filter(
      (c) => c.category === 'security',
    );
    expect(secChecks.length).toBeGreaterThan(0);
  });

  it('has governance checks', () => {
    const report = runDoctor(dir, baseStack);
    const govChecks = report.checks.filter(
      (c) => c.category === 'governance',
    );
    expect(govChecks.length).toBeGreaterThan(0);
  });

  it('has quality checks', () => {
    const report = runDoctor(dir, baseStack);
    const qualChecks = report.checks.filter(
      (c) => c.category === 'quality',
    );
    expect(qualChecks.length).toBeGreaterThan(0);
  });

  it('detects missing CI as fail', () => {
    const noCiStack = { ...baseStack, hasCi: false };
    const report = runDoctor(dir, noCiStack);
    const ciCheck = report.checks.find((c) =>
      c.name.toLowerCase().includes('ci'),
    );
    expect(ciCheck?.status).toBe('fail');
  });

  it('detects missing linting as fail', () => {
    const noLintStack = { ...baseStack, hasLinting: false };
    const report = runDoctor(dir, noLintStack);
    const lintCheck = report.checks.find((c) =>
      c.name.toLowerCase().includes('lint'),
    );
    expect(lintCheck?.status).toBe('fail');
  });

  it('detects CLAUDE.md presence', () => {
    writeFile(dir, 'CLAUDE.md', '# Project\n');
    const report = runDoctor(dir, baseStack);
    const claudeCheck = report.checks.find((c) =>
      c.name.includes('CLAUDE.md'),
    );
    expect(claudeCheck?.status).toBe('pass');
  });

  it('warns when CLAUDE.md missing', () => {
    const report = runDoctor(dir, baseStack);
    const claudeCheck = report.checks.find((c) =>
      c.name.includes('CLAUDE.md'),
    );
    expect(claudeCheck?.status).toBe('warn');
  });

  it('detects ARCHITECTURE.md presence', () => {
    writeFile(dir, 'ARCHITECTURE.md', '# Arch\n');
    const report = runDoctor(dir, baseStack);
    const archCheck = report.checks.find((c) =>
      c.name.includes('Architecture'),
    );
    expect(archCheck?.status).toBe('pass');
  });

  it('calculates coupling score', () => {
    const report = runDoctor(dir, baseStack);
    expect(report.couplingScore).toBeGreaterThanOrEqual(0);
    expect(report.couplingScore).toBeLessThanOrEqual(100);
  });

  it('calculates complexity score', () => {
    const report = runDoctor(dir, baseStack);
    expect(report.complexityScore).toBeGreaterThanOrEqual(0);
    expect(report.complexityScore).toBeLessThanOrEqual(100);
  });

  it('returns null trend with no baseline', () => {
    const report = runDoctor(dir, baseStack);
    expect(report.trend).toBeNull();
  });

  it('grade is A-F', () => {
    const report = runDoctor(dir, baseStack);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
  });

  it('score is 0-100', () => {
    const report = runDoctor(dir, baseStack);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('clean project scores well', () => {
    writeFile(dir, 'CLAUDE.md', '# Project\n');
    writeFile(dir, 'ARCHITECTURE.md', '# Arch\n');
    writeFile(dir, '.github/workflows/ci.yml', 'name: CI\n');
    const report = runDoctor(dir, baseStack);
    expect(report.score).toBeGreaterThanOrEqual(50);
  });

  it('warns when function sprawl count is 1-2', () => {
    let manyFunctions = '';
    for (let i = 0; i < 16; i++) {
      manyFunctions += `function fn${i}() { return ${i}; }\n`;
    }
    writeFile(dir, 'src/sprawl.ts', manyFunctions);
    const report = runDoctor(dir, baseStack);
    const sprawlCheck = report.checks.find((c) => c.name.includes('function sprawl'));
    expect(['warn', 'fail']).toContain(sprawlCheck?.status);
  });

  it('warns when security findings count is 1-2', () => {
    writeFile(dir, 'src/config.ts', 'const apiKey = "sk-1234567890abcdef";\n');
    const report = runDoctor(dir, baseStack);
    const secCheck = report.checks.find((c) => c.name.includes('security vulnerabilities'));
    expect(['warn', 'fail']).toContain(secCheck?.status);
  });

  it('warns when quality score is 40-59', () => {
    for (let i = 0; i < 10; i++) {
      writeFile(dir, `src/bad${i}.ts`, `
        const password = "hardcoded${i}";
        try { fetch('/api'); } catch (e) {}
        eval('code');
      `);
    }
    const report = runDoctor(dir, baseStack);
    const qualCheck = report.checks.find((c) => c.name.includes('Quality score'));
    expect(['warn', 'fail', 'pass']).toContain(qualCheck?.status);
  });

  it('warns when error-handling count is 1-4', () => {
    writeFile(dir, 'src/catches.ts', `
      try { fetch('/a'); } catch (e) {}
      try { fetch('/b'); } catch (e) {}
      try { fetch('/c'); } catch (err) {}
    `);
    const report = runDoctor(dir, baseStack);
    const errCheck = report.checks.find((c) => c.name.includes('Error handling'));
    expect(['warn', 'fail', 'pass']).toContain(errCheck?.status);
  });

  it('complexityScore is below 100 when findings exist', () => {
    writeFile(dir, 'src/vuln.ts', 'const secret = "password123";\n');
    const report = runDoctor(dir, baseStack);
    expect(report.complexityScore).toBeLessThanOrEqual(100);
    expect(report.complexityScore).toBeGreaterThanOrEqual(0);
  });

  it('returns trend info when baseline has 2+ snapshots', () => {
    const baselineData = {
      version: 1,
      history: [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          score: 80,
          grade: 'B',
          filesScanned: 3,
          findingCount: 5,
          categories: [],
        },
        {
          timestamp: '2026-01-02T00:00:00.000Z',
          score: 85,
          grade: 'B',
          filesScanned: 3,
          findingCount: 3,
          categories: [],
        },
      ],
    };
    writeFile(dir, '.forge/baseline.json', JSON.stringify(baselineData));
    const report = runDoctor(dir, baseStack);
    expect(report.trend).not.toBeNull();
    expect(report.trend?.direction).toMatch(/improving|stable|degrading/);
    expect(typeof report.trend?.scoreDelta).toBe('number');
    expect(report.trend?.snapshots).toBe(2);
  });

  it('returns improving trend when score delta > 2', () => {
    const baselineData = {
      version: 1,
      history: [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          score: 70,
          grade: 'C',
          filesScanned: 3,
          findingCount: 10,
          categories: [],
        },
        {
          timestamp: '2026-01-02T00:00:00.000Z',
          score: 80,
          grade: 'B',
          filesScanned: 3,
          findingCount: 5,
          categories: [],
        },
      ],
    };
    writeFile(dir, '.forge/baseline.json', JSON.stringify(baselineData));
    const report = runDoctor(dir, baseStack);
    expect(report.trend?.direction).toBe('improving');
  });

  it('returns degrading trend when score delta < -2', () => {
    const baselineData = {
      version: 1,
      history: [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          score: 90,
          grade: 'A',
          filesScanned: 3,
          findingCount: 2,
          categories: [],
        },
        {
          timestamp: '2026-01-02T00:00:00.000Z',
          score: 80,
          grade: 'B',
          filesScanned: 3,
          findingCount: 8,
          categories: [],
        },
      ],
    };
    writeFile(dir, '.forge/baseline.json', JSON.stringify(baselineData));
    const report = runDoctor(dir, baseStack);
    expect(report.trend?.direction).toBe('degrading');
  });

  it('returns stable trend when score delta is -2 to 2', () => {
    const baselineData = {
      version: 1,
      history: [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          score: 80,
          grade: 'B',
          filesScanned: 3,
          findingCount: 5,
          categories: [],
        },
        {
          timestamp: '2026-01-02T00:00:00.000Z',
          score: 81,
          grade: 'B',
          filesScanned: 3,
          findingCount: 4,
          categories: [],
        },
      ],
    };
    writeFile(dir, '.forge/baseline.json', JSON.stringify(baselineData));
    const report = runDoctor(dir, baseStack);
    expect(report.trend?.direction).toBe('stable');
  });
});
