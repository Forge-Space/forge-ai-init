import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectStack } from '../src/detector.js';
import { runTestAutogen } from '../src/test-autogen.js';

function createProject(files: Record<string, string>): string {
  const dir = join(
    tmpdir(),
    `forge-test-autogen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(dir, path);
    mkdirSync(fullPath.substring(0, fullPath.lastIndexOf('/')), {
      recursive: true,
    });
    writeFileSync(fullPath, content);
  }
  return dir;
}

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir });
  execSync('git config user.email "test@forge.dev"', { cwd: dir });
  execSync('git config user.name "Forge Test"', { cwd: dir });
  execSync('git add .', { cwd: dir });
  execSync('git commit -m "init"', { cwd: dir });
}

describe('runTestAutogen', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    delete process.env.FORGE_TEST_AUTOGEN_BYPASS;
    delete process.env.FORGE_BYPASS_REASON;
    delete process.env.FORGE_BYPASS_EXPIRES_AT;
  });

  it('creates unit tests for changed TypeScript source files', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        scripts: { test: 'jest' },
        devDependencies: { typescript: '^5.7.0' },
      }),
      'tsconfig.json': '{}',
      'src/math/add.ts': 'export const add = (a: number, b: number) => a + b;\n',
    });

    initGitRepo(tempDir);
    writeFileSync(
      join(tempDir, 'src/math/add.ts'),
      'export const add = (a: number, b: number) => a + b + 1;\n',
    );
    execSync('git add src/math/add.ts', { cwd: tempDir });

    const result = runTestAutogen(tempDir, detectStack(tempDir), {
      staged: true,
      write: true,
      check: true,
    });

    expect(result.passed).toBe(true);
    expect(result.created.some((f) => f.includes('tests/unit/src/math/add.unit.test.ts'))).toBe(
      true,
    );
    expect(existsSync(join(tempDir, 'tests/unit/src/math/add.unit.test.ts'))).toBe(true);
  });

  it('requires integration tests for boundary files', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        scripts: { test: 'jest' },
        devDependencies: { typescript: '^5.7.0' },
      }),
      'tsconfig.json': '{}',
      'src/api/users.ts': 'export async function users() { return fetch("/api/users"); }\n',
    });

    initGitRepo(tempDir);
    writeFileSync(
      join(tempDir, 'src/api/users.ts'),
      'export async function users() { return fetch("/api/v2/users"); }\n',
    );
    execSync('git add src/api/users.ts', { cwd: tempDir });

    const result = runTestAutogen(tempDir, detectStack(tempDir), {
      staged: true,
      write: true,
      check: true,
    });

    expect(result.passed).toBe(true);
    expect(
      result.requirements.some(
        (item) =>
          item.scope === 'integration' && item.sourceFile === 'src/api/users.ts',
      ),
    ).toBe(true);
    expect(
      existsSync(join(tempDir, 'tests/integration/src/api/users.integration.test.ts')),
    ).toBe(true);
  });

  it('requires E2E tests when UI and API change together', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({
        scripts: { test: 'jest' },
        devDependencies: { typescript: '^5.7.0' },
      }),
      'tsconfig.json': '{}',
      'src/ui/login.tsx': 'export function Login() { return null; }\n',
      'src/api/login.ts': 'export async function login() { return fetch("/login"); }\n',
    });

    initGitRepo(tempDir);
    writeFileSync(
      join(tempDir, 'src/ui/login.tsx'),
      'export function Login() { return <div>Login</div>; }\n',
    );
    writeFileSync(
      join(tempDir, 'src/api/login.ts'),
      'export async function login() { return fetch("/api/login"); }\n',
    );
    execSync('git add src/ui/login.tsx src/api/login.ts', {
      cwd: tempDir,
    });

    const result = runTestAutogen(tempDir, detectStack(tempDir), {
      staged: true,
      write: true,
      check: true,
    });

    expect(result.passed).toBe(true);
    expect(result.requirements.some((item) => item.scope === 'e2e')).toBe(true);
    expect(existsSync(join(tempDir, 'tests/e2e/src/ui/login.e2e.test.ts'))).toBe(true);
  });

  it('fails bypass without reason/expiry', () => {
    tempDir = createProject({
      'package.json': JSON.stringify({ scripts: { test: 'jest' } }),
      'src/index.ts': 'export const a = 1;\n',
    });

    initGitRepo(tempDir);
    writeFileSync(join(tempDir, 'src/index.ts'), 'export const a = 2;\n');
    execSync('git add src/index.ts', { cwd: tempDir });

    process.env.FORGE_TEST_AUTOGEN_BYPASS = '1';

    const result = runTestAutogen(tempDir, detectStack(tempDir), {
      staged: true,
      check: true,
    });

    expect(result.passed).toBe(false);
    expect(result.missing[0]).toContain('Bypass requires');
  });

  it('supports python unit and integration generation', () => {
    tempDir = createProject({
      'pyproject.toml': '[tool.pytest.ini_options]\npythonpath = ["."]\n',
      'src/service/repo.py': 'def fetch_users():\n    return []\n',
    });

    initGitRepo(tempDir);
    writeFileSync(
      join(tempDir, 'src/service/repo.py'),
      'def fetch_users():\n    return ["a"]\n',
    );
    execSync('git add src/service/repo.py', { cwd: tempDir });

    const result = runTestAutogen(tempDir, detectStack(tempDir), {
      staged: true,
      write: true,
      check: true,
    });

    expect(result.stack).toBe('python');
    expect(result.passed).toBe(true);
    expect(result.created.some((f) => f.startsWith('tests/unit/test_src_service_repo'))).toBe(
      true,
    );
    expect(result.created.some((f) => f.startsWith('tests/integration/test_src_service_repo'))).toBe(
      true,
    );
    expect(readFileSync(join(tempDir, result.created[0] ?? ''), 'utf-8')).toContain('assert True');
  });
});
