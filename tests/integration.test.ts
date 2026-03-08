import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStack } from '../src/detector.js';
import { generate } from '../src/generator.js';

function createProject(
  files: Record<string, string>,
): string {
  const dir = join(
    tmpdir(),
    `forge-ai-init-int-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('integration', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates full standard tier for Next.js project', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        dependencies: { next: '^15.0.0', react: '^19.0.0' },
        devDependencies: { typescript: '^5.7.0', jest: '^30.0.0' },
        scripts: { build: 'next build', test: 'jest', lint: 'eslint .' },
      }),
      'tsconfig.json': '{}',
      '.prettierrc': '{}',
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'standard',
      tools: ['claude', 'cursor'],
      force: false,
      dryRun: false,
    });

    expect(result.created.length).toBeGreaterThan(0);
    expect(result.skipped.length).toBe(0);

    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursorrules'))).toBe(true);
    expect(
      existsSync(join(tempDir, '.claude', 'settings.json')),
    ).toBe(true);
    expect(
      existsSync(
        join(tempDir, '.claude', 'skills', 'quality-gate', 'SKILL.md'),
      ),
    ).toBe(true);
    expect(existsSync(join(tempDir, '.mcp.json'))).toBe(true);

    const claudeMd = readFileSync(
      join(tempDir, 'CLAUDE.md'),
      'utf-8',
    );
    expect(claudeMd).toContain('Next.js');
    expect(claudeMd).toContain('React');
    expect(claudeMd).toContain('TypeScript');
  });

  it('generates lite tier with minimal output', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        dependencies: { express: '^5.0.0' },
        scripts: { start: 'node index.js' },
      }),
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'lite',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude', 'settings.json'))).toBe(
      true,
    );
    expect(
      existsSync(join(tempDir, '.claude', 'skills')),
    ).toBe(false);
    expect(existsSync(join(tempDir, '.mcp.json'))).toBe(false);
    expect(
      existsSync(join(tempDir, '.github', 'workflows')),
    ).toBe(false);
  });

  it('skips existing files without --force', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
      'CLAUDE.md': '# My existing rules\n',
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'standard',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    expect(result.skipped).toContain(join(tempDir, 'CLAUDE.md'));

    const content = readFileSync(
      join(tempDir, 'CLAUDE.md'),
      'utf-8',
    );
    expect(content).toBe('# My existing rules\n');
  });

  it('overwrites existing files with --force', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
      'CLAUDE.md': '# My existing rules\n',
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'standard',
      tools: ['claude'],
      force: true,
      dryRun: false,
    });

    expect(result.created).toContain(join(tempDir, 'CLAUDE.md'));

    const content = readFileSync(
      join(tempDir, 'CLAUDE.md'),
      'utf-8',
    );
    expect(content).toContain('## Architecture');
  });

  it('dry run creates nothing', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'enterprise',
      tools: ['claude', 'cursor', 'windsurf', 'copilot'],
      force: false,
      dryRun: true,
    });

    expect(result.created.length).toBeGreaterThan(0);
    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(tempDir, '.cursorrules'))).toBe(false);
  });

  it('generates for all 4 AI tools', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        dependencies: { react: '^19.0.0' },
      }),
    });

    const stack = detectStack(tempDir);
    generate(stack, {
      projectDir: tempDir,
      tier: 'standard',
      tools: ['claude', 'cursor', 'windsurf', 'copilot'],
      force: false,
      dryRun: false,
    });

    expect(existsSync(join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursorrules'))).toBe(true);
    expect(existsSync(join(tempDir, '.windsurfrules'))).toBe(true);
    expect(
      existsSync(
        join(tempDir, '.github', 'copilot-instructions.md'),
      ),
    ).toBe(true);
  });

  it('generates enterprise tier with policies and scorecard', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        dependencies: { next: '^15.0.0', react: '^19.0.0' },
        devDependencies: { typescript: '^5.7.0' },
        scripts: { build: 'next build', test: 'jest', lint: 'eslint .' },
      }),
      'tsconfig.json': '{}',
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'enterprise',
      tools: ['claude'],
      force: false,
      dryRun: false,
    });

    expect(existsSync(join(tempDir, '.forge', 'policies', 'security.policy.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.forge', 'policies', 'quality.policy.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.forge', 'policies', 'compliance.policy.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.forge', 'policies', 'framework.policy.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.forge', 'scorecard.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.forge', 'features.json'))).toBe(true);

    const wfPaths = result.created.filter(f => f.includes('workflows'));
    expect(wfPaths.some(f => f.includes('scorecard.yml'))).toBe(true);
    expect(wfPaths.some(f => f.includes('policy-check.yml'))).toBe(true);

    const fw = JSON.parse(readFileSync(join(tempDir, '.forge', 'policies', 'framework.policy.json'), 'utf-8'));
    expect(fw.rules.some((r: { id: string }) => r.id === 'fw-002')).toBe(true);
  });

  it('generates GitLab CI for gitlab-ci projects', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        dependencies: { express: '^5.0.0' },
        scripts: { build: 'tsc', test: 'jest', lint: 'eslint .' },
      }),
      'tsconfig.json': '{}',
      '.gitlab-ci.yml': 'old',
    });

    const stack = detectStack(tempDir);
    const result = generate(stack, {
      projectDir: tempDir,
      tier: 'standard',
      tools: ['claude'],
      force: true,
      dryRun: false,
    });

    const gitlab = result.created.find((f) =>
      f.includes('.gitlab-ci.yml'),
    );
    expect(gitlab).toBeDefined();

    const content = readFileSync(
      join(tempDir, '.gitlab-ci.yml'),
      'utf-8',
    );
    expect(content).toContain('stages:');
    expect(content).toContain('image: node:22');
  });
});
