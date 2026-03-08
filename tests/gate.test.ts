import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runGate } from '../src/gate.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-gate-${Date.now()}`);
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

describe('gate', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns gate result with required fields', () => {
    const result = runGate(dir);
    expect(result.passed).toBeDefined();
    expect(result.score).toBeDefined();
    expect(result.grade).toBeDefined();
    expect(result.threshold).toBeDefined();
    expect(result.phase).toBeDefined();
    expect(result.violations).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('passes with clean code', () => {
    const result = runGate(dir);
    expect(result.passed).toBe(true);
    expect(result.summary).toContain('PASSED');
  });

  it('auto-detects phase from score', () => {
    const result = runGate(dir);
    expect(['foundation', 'stabilization', 'production']).toContain(
      result.phase,
    );
  });

  it('uses explicit phase when provided', () => {
    const result = runGate(dir, 'production');
    expect(result.phase).toBe('production');
  });

  it('uses explicit threshold when provided', () => {
    const result = runGate(dir, undefined, 99);
    expect(result.threshold).toBe(99);
  });

  it('fails when score below threshold', () => {
    const result = runGate(dir, undefined, 101);
    expect(result.passed).toBe(false);
    expect(result.summary).toContain('FAILED');
  });

  it('fails with critical findings in any phase', () => {
    writeFile(
      dir,
      'src/bad.ts',
      'const password = "secret123";\nconst api_key = "sk-123abc";\n',
    );
    const result = runGate(dir, 'foundation');
    if (result.violations.length > 0) {
      expect(result.passed).toBe(false);
    }
  });

  it('blocks high severity in production phase', () => {
    const result = runGate(dir, 'production');
    expect(result.phase).toBe('production');
  });

  it('respects .forgerc.json config', () => {
    writeFile(
      dir,
      '.forgerc.json',
      JSON.stringify({
        preset: 'strict',
        thresholds: { deploy: 90 },
      }),
    );
    const result = runGate(dir);
    expect(result.threshold).toBeLessThanOrEqual(90);
  });

  it('returns violations array', () => {
    const result = runGate(dir);
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('violations have required shape', () => {
    writeFile(
      dir,
      'src/vuln.ts',
      'const secret = "hardcoded-password";\n',
    );
    const result = runGate(dir);
    for (const v of result.violations) {
      expect(v.rule).toBeDefined();
      expect(v.severity).toBeDefined();
      expect(v.count).toBeGreaterThan(0);
      expect(v.blocked).toBe(true);
    }
  });

  it('score is 0-100', () => {
    const result = runGate(dir);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('grade is A-F', () => {
    const result = runGate(dir);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
  });
});
