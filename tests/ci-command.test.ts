import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateCiPipeline, type CiOptions } from '../src/ci-command.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-ci-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('ci-command', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('generates GitHub Actions config', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
    });
    expect(result.provider).toBe('github-actions');
    expect(result.filePath).toBe(
      '.github/workflows/forge-quality.yml',
    );
    expect(result.content).toContain('actions/checkout@v4');
    expect(result.content).toContain('forge-ai-init gate');
    expect(result.content).toContain('forge-ai-init migrate');
  });

  it('generates GitLab CI config', () => {
    const result = generateCiPipeline(dir, {
      provider: 'gitlab-ci',
    });
    expect(result.provider).toBe('gitlab-ci');
    expect(result.filePath).toBe('.gitlab-ci.yml');
    expect(result.content).toContain('stage: test');
    expect(result.content).toContain('image: node:22');
    expect(result.content).toContain('artifacts');
  });

  it('generates Bitbucket Pipelines config', () => {
    const result = generateCiPipeline(dir, {
      provider: 'bitbucket',
    });
    expect(result.provider).toBe('bitbucket');
    expect(result.filePath).toBe('bitbucket-pipelines.yml');
    expect(result.content).toContain('pull-requests');
    expect(result.content).toContain('Forge Quality Gate');
  });

  it('uses custom phase', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
      phase: 'production',
    });
    expect(result.content).toContain('--phase production');
  });

  it('uses custom threshold', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
      threshold: 85,
    });
    expect(result.content).toContain('--threshold 85');
  });

  it('defaults to foundation phase', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
    });
    expect(result.content).toContain('--phase foundation');
  });

  it('includes baseline step when requested', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
      includeBaseline: true,
    });
    expect(result.content).toContain('forge-ai-init baseline');
    expect(result.commands).toContain(
      'npx forge-ai-init baseline',
    );
  });

  it('excludes baseline step by default', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
    });
    expect(result.content).not.toContain(
      'forge-ai-init baseline',
    );
  });

  it('returns commands array', () => {
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
    });
    expect(result.commands.length).toBeGreaterThanOrEqual(2);
    expect(result.commands[0]).toContain('migrate');
    expect(result.commands[1]).toContain('gate');
  });

  it('respects .forgerc.json threshold', () => {
    writeFileSync(
      join(dir, '.forgerc.json'),
      JSON.stringify({
        preset: 'strict',
        thresholds: { pr: 85 },
      }),
    );
    const result = generateCiPipeline(dir, {
      provider: 'github-actions',
    });
    expect(result.content).toContain('--threshold 85');
  });
});
