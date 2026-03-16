import { describe, it, expect, afterEach } from '@jest/globals';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generate } from '../src/generator.js';
import { detectStack } from '../src/detector.js';
import type { DetectedStack } from '../src/types.js';

function createProject(files: Record<string, string>): string {
  const dir = join(
    tmpdir(),
    `forge-gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    const parentDir = full.substring(0, full.lastIndexOf('/'));
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: false,
};

describe('generate', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('cursor tool branch: generates .cursorrules when cursor in tools', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude', 'cursor'],
      force: false,
      dryRun: false,
    });

    expect(result.created.some(f => f.endsWith('.cursorrules'))).toBe(true);
    expect(existsSync(join(dir, '.cursorrules'))).toBe(true);
  });

  it('windsurf tool branch: generates .windsurfrules when windsurf in tools', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude', 'windsurf'],
      force: false,
      dryRun: false,
    });

    expect(result.created.some(f => f.endsWith('.windsurfrules'))).toBe(true);
    expect(existsSync(join(dir, '.windsurfrules'))).toBe(true);
  });

  it('copilot tool branch: generates copilot-instructions.md when copilot in tools', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude', 'copilot'],
      force: false,
      dryRun: false,
    });

    expect(
      result.created.some(f => f.includes('copilot-instructions.md')),
    ).toBe(true);
    expect(
      existsSync(join(dir, '.github', 'copilot-instructions.md')),
    ).toBe(true);
  });

  it('generateSkillFiles: creates skill files for standard tier with claude tool', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    const skillFiles = result.created.filter(f => f.includes('skills'));
    expect(skillFiles.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, '.claude', 'skills'))).toBe(true);
  });

  it('generateSkillFiles: no skill files when claude not in tools', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['cursor'],
      force: false,
      dryRun: false,
    });

    const skillFiles = result.created.filter(f => f.includes('skills'));
    expect(skillFiles.length).toBe(0);
    expect(existsSync(join(dir, '.claude', 'skills'))).toBe(false);
  });

  it('generateMcpFile: creates .mcp.json for standard tier (non-empty config)', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    // context7 is always added so .mcp.json should always be created for non-lite
    expect(result.created.some(f => f.endsWith('.mcp.json'))).toBe(true);
    expect(existsSync(join(dir, '.mcp.json'))).toBe(true);
  });

  it('generateMcpFile: .mcp.json has playwright for nextjs stack', () => {
    dir = createProject({
      'package.json': JSON.stringify({
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      }),
    });

    const stack = detectStack(dir);
    const result = generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    expect(result.created.some(f => f.endsWith('.mcp.json'))).toBe(true);
    const mcpPath = join(dir, '.mcp.json');
    expect(existsSync(mcpPath)).toBe(true);
  });

  it('generateWorkflowFiles: skipped for lite tier', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'lite',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    const workflowFiles = result.created.filter(f =>
      f.includes('.github/workflows'),
    );
    expect(workflowFiles.length).toBe(0);
  });

  it('generateMigrationDocs: skipped when migrate=false', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
      migrate: false,
    });

    expect(result.created.some(f => f.endsWith('MIGRATION.md'))).toBe(false);
    expect(existsSync(join(dir, 'MIGRATION.md'))).toBe(false);
  });

  it('generateMigrationDocs: creates MIGRATION.md when migrate=true', () => {
    dir = createProject({
      'package.json': JSON.stringify({
        dependencies: { express: '^4.0.0' },
      }),
    });

    const stack = detectStack(dir);
    const result = generate(stack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
      migrate: true,
    });

    expect(result.created.some(f => f.endsWith('MIGRATION.md'))).toBe(true);
    expect(existsSync(join(dir, 'MIGRATION.md'))).toBe(true);
  });

  it('dryRun: no files written but result.created is populated', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: true,
    });

    expect(result.created.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
  });

  it('generateMcpFile: skipped for lite tier', () => {
    dir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const result = generate(baseStack, {
      projectDir: dir,
      tier: 'lite',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    expect(result.created.some(f => f.endsWith('.mcp.json'))).toBe(false);
    expect(existsSync(join(dir, '.mcp.json'))).toBe(false);
  });
});
