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
});
