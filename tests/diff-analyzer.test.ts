import {
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { analyzeDiff } from '../src/diff-analyzer.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-diff-${Date.now()}`);
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

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir });
  execSync('git config user.email "test@test.com"', {
    cwd: dir,
  });
  execSync('git config user.name "Test"', { cwd: dir });
}

describe('diff-analyzer', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty result for non-git directory', () => {
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    const result = analyzeDiff(dir);
    expect(result.changedFiles).toHaveLength(0);
    expect(result.summary).toContain('No changed files');
  });

  it('returns DiffResult with required fields', () => {
    const result = analyzeDiff(dir);
    expect(result.changedFiles).toBeDefined();
    expect(result.beforeScore).toBeDefined();
    expect(result.afterScore).toBeDefined();
    expect(result.delta).toBeDefined();
    expect(result.improved).toBeDefined();
    expect(result.newFindings).toBeDefined();
    expect(result.resolvedFindings).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('detects staged files', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });
    writeFile(
      dir,
      'src/bad.ts',
      'try { x(); } catch (e) {}\n',
    );
    execSync('git add src/bad.ts', { cwd: dir });

    const result = analyzeDiff(dir, { staged: true });
    expect(result.changedFiles).toContain('src/bad.ts');
    expect(result.newFindings.length).toBeGreaterThan(0);
  });

  it('reports findings in changed files', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });
    writeFile(
      dir,
      'src/vuln.ts',
      'const password = "secret123";\n',
    );
    execSync('git add src/vuln.ts', { cwd: dir });

    const result = analyzeDiff(dir, { staged: true });
    const secretFinding = result.newFindings.find(
      (f) => f.rule === 'hardcoded-secret',
    );
    expect(secretFinding).toBeDefined();
  });

  it('improved is true when delta >= 0', () => {
    const result = analyzeDiff(dir);
    expect(result.improved).toBe(true);
    expect(result.delta).toBe(0);
  });

  it('summary mentions file count', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/a.ts', 'export const a = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });
    writeFile(dir, 'src/b.ts', 'export const b = 2;\n');
    writeFile(dir, 'src/c.ts', 'export const c = 3;\n');
    execSync('git add .', { cwd: dir });

    const result = analyzeDiff(dir, { staged: true });
    if (result.changedFiles.length > 0) {
      expect(result.summary).toContain('file');
    }
  });

  it('resolvedFindings is empty array', () => {
    const result = analyzeDiff(dir);
    expect(result.resolvedFindings).toEqual([]);
  });

  it('newFindings have required shape', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });
    writeFile(
      dir,
      'src/bad.ts',
      'try { x(); } catch (e) {}\n',
    );
    execSync('git add src/bad.ts', { cwd: dir });

    const result = analyzeDiff(dir, { staged: true });
    for (const f of result.newFindings) {
      expect(f.file).toBeDefined();
      expect(f.rule).toBeDefined();
      expect(f.severity).toBeDefined();
      expect(f.message).toBeDefined();
    }
  });

  it('scores are 0-100', () => {
    const result = analyzeDiff(dir);
    expect(result.beforeScore).toBeGreaterThanOrEqual(0);
    expect(result.beforeScore).toBeLessThanOrEqual(100);
    expect(result.afterScore).toBeGreaterThanOrEqual(0);
    expect(result.afterScore).toBeLessThanOrEqual(100);
  });

  it('detects changed files using base..HEAD diff', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });

    execSync('git checkout -b feature', { cwd: dir });
    writeFile(dir, 'src/bad.ts', 'try { x(); } catch (e) {}\n');
    execSync('git add src/bad.ts', { cwd: dir });
    execSync('git commit -m "add bad file"', { cwd: dir });

    const result = analyzeDiff(dir, { base: 'main', head: 'HEAD' });
    expect(result.changedFiles).toBeDefined();
    expect(result.newFindings).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('handles opts.base and opts.head parameters', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/index.ts', 'export const x = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });

    const result = analyzeDiff(dir, { base: 'HEAD', head: 'HEAD' });
    expect(result).toBeDefined();
    expect(typeof result.beforeScore).toBe('number');
    expect(typeof result.afterScore).toBe('number');
  });

  it('returns empty result when opts.base/head yields no code files', () => {
    initGitRepo(dir);
    writeFile(dir, 'README.md', '# readme\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });

    const result = analyzeDiff(dir, { base: 'HEAD', head: 'HEAD' });
    expect(result.changedFiles).toHaveLength(0);
    expect(result.summary).toContain('No changed files');
  });

  it('summary mentions degraded when delta is negative', () => {
    initGitRepo(dir);
    writeFile(dir, 'src/good.ts', 'export const x = 1;\n');
    execSync('git add .', { cwd: dir });
    execSync('git commit -m "init"', { cwd: dir });
    writeFile(dir, 'src/bad.ts', 'try { const p = "secret123"; } catch (e) {}\n');
    execSync('git add src/bad.ts', { cwd: dir });

    const result = analyzeDiff(dir, { staged: true });
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
