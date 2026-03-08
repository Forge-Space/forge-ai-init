import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStack } from '../src/detector.js';
import { generate } from '../src/generator.js';
import { updateProject } from '../src/updater.js';

function createProject(
  files: Record<string, string>,
): string {
  const dir = join(
    tmpdir(),
    `forge-update-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(full.substring(0, full.lastIndexOf('/')), {
      recursive: true,
    });
    writeFileSync(full, content);
  }
  return dir;
}

describe('updateProject', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('detects existing tools from governance files', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude', 'cursor'],
      force: false,
      dryRun: false,
    });

    const report = updateProject(dir, stack);
    expect(report.detectedTools).toContain('claude');
    expect(report.detectedTools).toContain('cursor');
  });

  it('detects existing tier from file structure', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'enterprise',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    const report = updateProject(dir, stack);
    expect(report.detectedTier).toBe('enterprise');
  });

  it('reports unchanged when content matches', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    const report = updateProject(dir, stack);
    expect(report.unchanged.length).toBeGreaterThan(0);
    expect(report.updated.length).toBe(0);
    expect(report.added.length).toBe(0);
  });

  it('reports updated when content differs', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    writeFileSync(join(dir, 'CLAUDE.md'), '# Old content\n');

    const report = updateProject(dir, stack);
    expect(report.updated).toContain('CLAUDE.md');
  });

  it('allows tier override', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'lite',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    const report = updateProject(dir, stack, 'standard');
    expect(report.detectedTier).toBe('standard');
    expect(report.added.length).toBeGreaterThan(0);
  });

  it('allows tools override', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    const report = updateProject(dir, stack, undefined, [
      'claude',
      'cursor',
    ]);
    expect(report.detectedTools).toContain('cursor');
    expect(
      report.added.some(f => f === '.cursorrules') ||
        report.updated.some(f => f === '.cursorrules'),
    ).toBe(true);
  });

  it('detects migration mode from CLAUDE.md', () => {
    dir = createProject({
      'package.json': JSON.stringify({
        dependencies: { express: '^5.0.0' },
      }),
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
      migrate: true,
    });

    const report = updateProject(dir, stack);
    expect(report.migrate).toBe(true);
  });

  it('adds new skills when upgrading tier', () => {
    dir = createProject({
      'package.json': JSON.stringify({
        dependencies: { react: '^19.0.0' },
        devDependencies: { typescript: '^5.7.0' },
      }),
      'tsconfig.json': '{}',
    });

    const stack = detectStack(dir);
    generate(stack, {
      projectDir: dir,
      tier: 'lite',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    expect(
      existsSync(join(dir, '.claude', 'skills')),
    ).toBe(false);

    const report = updateProject(dir, stack, 'enterprise');
    const skillFiles = report.added.filter(f =>
      f.includes('skills'),
    );
    expect(skillFiles.length).toBeGreaterThan(0);
  });
});
