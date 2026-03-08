import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  scaffold,
  TEMPLATE_LIST,
  type TemplateId,
} from '../src/scaffold.js';

function makeTempDir(): string {
  const dir = join(tmpdir(), `forge-scaf-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('scaffold', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('exports TEMPLATE_LIST with 5 templates', () => {
    expect(TEMPLATE_LIST).toHaveLength(5);
    const ids = TEMPLATE_LIST.map((t) => t.id);
    expect(ids).toContain('nextjs-app');
    expect(ids).toContain('express-api');
    expect(ids).toContain('fastapi-service');
    expect(ids).toContain('ts-library');
    expect(ids).toContain('cli-tool');
  });

  it('creates nextjs-app template', () => {
    const result = scaffold({
      template: 'nextjs-app',
      name: 'my-next',
      dir,
    });
    expect(result.template).toBe('nextjs-app');
    expect(result.projectDir).toBe(join(dir, 'my-next'));
    expect(result.created).toContain('package.json');
    expect(result.created).toContain('.gitignore');
    expect(result.created).toContain('CLAUDE.md');
    expect(result.created).toContain('.forgerc.json');
    expect(result.created).toContain('src/app/layout.tsx');
    expect(result.created).toContain('src/app/page.tsx');
  });

  it('creates express-api template', () => {
    const result = scaffold({
      template: 'express-api',
      name: 'my-api',
      dir,
    });
    expect(result.created).toContain('src/index.ts');
    expect(result.created).toContain('package.json');
    const pkg = JSON.parse(
      readFileSync(join(dir, 'my-api', 'package.json'), 'utf-8'),
    );
    expect(pkg.dependencies.express).toBeDefined();
    expect(pkg.dependencies.zod).toBeDefined();
  });

  it('creates fastapi-service template', () => {
    const result = scaffold({
      template: 'fastapi-service',
      name: 'my-api',
      dir,
    });
    expect(result.created).toContain('pyproject.toml');
    expect(result.created).toContain('src/main.py');
    expect(result.created).toContain('tests/test_main.py');
  });

  it('creates ts-library template', () => {
    const result = scaffold({
      template: 'ts-library',
      name: 'my-lib',
      dir,
    });
    expect(result.created).toContain('src/index.ts');
    expect(result.created).toContain('tests/index.test.ts');
    const pkg = JSON.parse(
      readFileSync(join(dir, 'my-lib', 'package.json'), 'utf-8'),
    );
    expect(pkg.main).toContain('dist');
    expect(pkg.types).toContain('dist');
  });

  it('creates cli-tool template', () => {
    const result = scaffold({
      template: 'cli-tool',
      name: 'my-cli',
      dir,
    });
    expect(result.created).toContain('src/index.ts');
    const pkg = JSON.parse(
      readFileSync(join(dir, 'my-cli', 'package.json'), 'utf-8'),
    );
    expect(pkg.bin).toBeDefined();
    expect(pkg.dependencies['@clack/prompts']).toBeDefined();
  });

  it('includes governance files in all templates', () => {
    const templates: TemplateId[] = [
      'nextjs-app',
      'express-api',
      'fastapi-service',
      'ts-library',
      'cli-tool',
    ];
    for (const tmpl of templates) {
      const name = `proj-${tmpl}`;
      const result = scaffold({ template: tmpl, name, dir });
      expect(result.created).toContain('.gitignore');
      expect(result.created).toContain('CLAUDE.md');
      expect(result.created).toContain('.forgerc.json');
    }
  });

  it('throws on unknown template', () => {
    expect(() =>
      scaffold({
        template: 'unknown' as TemplateId,
        name: 'x',
        dir,
      }),
    ).toThrow('Unknown template');
  });

  it('throws if directory already exists', () => {
    mkdirSync(join(dir, 'existing'), { recursive: true });
    expect(() =>
      scaffold({
        template: 'ts-library',
        name: 'existing',
        dir,
      }),
    ).toThrow('already exists');
  });

  it('creates project directory', () => {
    scaffold({
      template: 'ts-library',
      name: 'new-proj',
      dir,
    });
    expect(existsSync(join(dir, 'new-proj'))).toBe(true);
  });

  it('writes actual file content', () => {
    scaffold({
      template: 'nextjs-app',
      name: 'test-app',
      dir,
    });
    const claudeMd = readFileSync(
      join(dir, 'test-app', 'CLAUDE.md'),
      'utf-8',
    );
    expect(claudeMd).toContain('test-app');
    expect(claudeMd).toContain('npm run dev');
  });

  it('writes valid JSON in package.json', () => {
    scaffold({
      template: 'express-api',
      name: 'json-test',
      dir,
    });
    const raw = readFileSync(
      join(dir, 'json-test', 'package.json'),
      'utf-8',
    );
    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('json-test');
  });

  it('writes valid JSON in .forgerc.json', () => {
    scaffold({
      template: 'ts-library',
      name: 'rc-test',
      dir,
    });
    const raw = readFileSync(
      join(dir, 'rc-test', '.forgerc.json'),
      'utf-8',
    );
    const config = JSON.parse(raw);
    expect(config.preset).toBe('recommended');
  });

  it('nextjs template has correct tsconfig', () => {
    scaffold({
      template: 'nextjs-app',
      name: 'ts-test',
      dir,
    });
    const raw = readFileSync(
      join(dir, 'ts-test', 'tsconfig.json'),
      'utf-8',
    );
    const tsconfig = JSON.parse(raw);
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.jsx).toBe('preserve');
  });

  it('express template uses ESM', () => {
    scaffold({
      template: 'express-api',
      name: 'esm-test',
      dir,
    });
    const pkg = JSON.parse(
      readFileSync(
        join(dir, 'esm-test', 'package.json'),
        'utf-8',
      ),
    );
    expect(pkg.type).toBe('module');
  });
});
