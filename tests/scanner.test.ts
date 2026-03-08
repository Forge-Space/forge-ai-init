import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanProject } from '../src/scanner.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-scan-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, name: string, content: string): void {
  const path = join(dir, name);
  const parent = path.substring(0, path.lastIndexOf('/'));
  mkdirSync(parent, { recursive: true });
  writeFileSync(path, content);
}

describe('scanProject', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns A grade for clean project', () => {
    writeFile(dir, 'src/index.ts', 'export const hello = "world";\n');
    const report = scanProject(dir);
    expect(report.grade).toBe('A');
    expect(report.score).toBe(100);
    expect(report.filesScanned).toBe(1);
  });

  it('detects empty catch blocks', () => {
    writeFile(dir, 'app.ts', `
try {
  doSomething();
} catch (e) {}
`);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'empty-catch');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects hardcoded secrets', () => {
    writeFile(dir, 'config.ts', `
const password = "supersecret123";
`);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'hardcoded-secret');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
  });

  it('detects @ts-ignore', () => {
    writeFile(dir, 'hack.ts', `
// @ts-ignore
const x: number = "not a number";
`);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'ts-suppress');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects god files (>500 lines)', () => {
    const lines = Array.from({ length: 501 }, (_, i) =>
      `export const x${i} = ${i};`
    ).join('\n');
    writeFile(dir, 'big.ts', lines);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'god-file');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('high');
  });

  it('detects large files (300-500 lines)', () => {
    const lines = Array.from({ length: 350 }, (_, i) =>
      `export const x${i} = ${i};`
    ).join('\n');
    writeFile(dir, 'medium.ts', lines);
    const report = scanProject(dir);
    const finding = report.findings.find(f => f.rule === 'large-file');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('medium');
  });

  it('skips node_modules', () => {
    // Note: eval string in test data is intentional — testing scanner detection
    writeFile(dir, 'node_modules/bad/index.js', 'const x = Function("return 1")();');
    writeFile(dir, 'src/clean.ts', 'export const x = 1;\n');
    const report = scanProject(dir);
    expect(report.filesScanned).toBe(1);
  });

  it('scans multiple file types', () => {
    writeFile(dir, 'app.js', 'const x = 1;\n');
    writeFile(dir, 'main.py', 'x = 1\n');
    writeFile(dir, 'lib.tsx', 'export default () => null;\n');
    const report = scanProject(dir);
    expect(report.filesScanned).toBe(3);
  });

  it('provides category summary', () => {
    writeFile(dir, 'bad.ts', `
try { x(); } catch (e) {}
const token = "secret12345678";
`);
    const report = scanProject(dir);
    expect(report.summary.length).toBeGreaterThan(0);
    for (const cat of report.summary) {
      expect(cat.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('provides top files ranking', () => {
    writeFile(dir, 'a.ts', 'try { x(); } catch (e) {}\n'.repeat(5));
    writeFile(dir, 'b.ts', 'export const x = 1;\n');
    const report = scanProject(dir);
    expect(report.topFiles.length).toBeGreaterThanOrEqual(1);
    expect(report.topFiles[0]!.file).toBe('a.ts');
  });

  it('respects maxFiles limit', () => {
    for (let i = 0; i < 10; i++) {
      writeFile(dir, `file${i}.ts`, `export const x = ${i};\n`);
    }
    const report = scanProject(dir, 3);
    expect(report.filesScanned).toBe(3);
  });

  it('returns JSON-serializable report', () => {
    writeFile(dir, 'app.ts', 'try { x(); } catch (e) {}\n');
    const report = scanProject(dir);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.grade).toBeDefined();
    expect(parsed.score).toBeDefined();
    expect(parsed.findings).toBeInstanceOf(Array);
  });
});
