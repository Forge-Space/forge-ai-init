import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type TemplateId =
  | 'nextjs-app'
  | 'express-api'
  | 'fastapi-service'
  | 'ts-library'
  | 'cli-tool';

export interface ScaffoldOptions {
  template: TemplateId;
  name: string;
  dir: string;
}

export interface ScaffoldResult {
  created: string[];
  template: TemplateId;
  projectDir: string;
}

interface TemplateFile {
  path: string;
  content: string;
}

function baseFiles(name: string): TemplateFile[] {
  return [
    {
      path: '.gitignore',
      content: 'node_modules/\ndist/\n.env\n.env.local\ncoverage/\n.next/\n.turbo/\n',
    },
    {
      path: 'CLAUDE.md',
      content: `# ${name}\n\n## Quick Reference\n\n\`\`\`bash\nnpm run dev      # Start development\nnpm run build    # Production build\nnpm run test     # Run tests\nnpm run lint     # Lint code\n\`\`\`\n\n## Conventions\n\n- Functions <50 lines, complexity <10\n- Conventional commits\n- >80% test coverage target\n- Security-first: validate inputs, sanitize outputs\n`,
    },
    {
      path: '.forgerc.json',
      content: JSON.stringify(
        {
          preset: 'recommended',
          thresholds: { error: 60, warn: 40 },
          ignore: ['dist/**', 'coverage/**', 'node_modules/**'],
        },
        null,
        2,
      ) + '\n',
    },
  ];
}

function nextjsTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
            test: 'jest --forceExit',
            'type-check': 'tsc --noEmit',
          },
          dependencies: {
            next: '^15.0.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            '@types/react': '^19.0.0',
            '@types/node': '^22.0.0',
            eslint: '^9.0.0',
            'eslint-config-next': '^15.0.0',
            jest: '^29.0.0',
            '@testing-library/react': '^16.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['dom', 'dom.iterable', 'esnext'],
            strict: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            jsx: 'preserve',
            incremental: true,
            paths: { '@/*': ['./src/*'] },
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
          exclude: ['node_modules'],
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/app/layout.tsx',
      content: `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    },
    {
      path: 'src/app/page.tsx',
      content: `export default function Home() {\n  return <main><h1>${name}</h1></main>;\n}\n`,
    },
  ];
}

function expressTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          scripts: {
            dev: 'tsx watch src/index.ts',
            build: 'tsup src/index.ts --format esm --dts',
            start: 'node dist/index.js',
            lint: 'eslint src/',
            test: 'jest --forceExit',
            'type-check': 'tsc --noEmit',
          },
          dependencies: {
            express: '^5.0.0',
            zod: '^3.23.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            '@types/express': '^5.0.0',
            '@types/node': '^22.0.0',
            tsx: '^4.0.0',
            tsup: '^8.0.0',
            jest: '^29.0.0',
            eslint: '^9.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/index.ts',
      content: `import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/health', (_req, res) => {\n  res.json({ status: 'ok' });\n});\n\nconst port = process.env.PORT ?? 3000;\napp.listen(port, () => {\n  console.log(\`Server running on port \${port}\`);\n});\n`,
    },
  ];
}

function fastapiTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'pyproject.toml',
      content: `[project]\nname = "${name}"\nversion = "0.1.0"\nrequires-python = ">=3.11"\ndependencies = ["fastapi>=0.115.0", "uvicorn>=0.34.0"]\n\n[project.optional-dependencies]\ndev = ["pytest>=8.0", "ruff>=0.8.0", "mypy>=1.13"]\n\n[tool.ruff]\ntarget-version = "py311"\nline-length = 100\n\n[tool.mypy]\nstrict = true\n`,
    },
    {
      path: 'src/main.py',
      content: `from fastapi import FastAPI\n\napp = FastAPI(title="${name}")\n\n\n@app.get("/health")\ndef health() -> dict[str, str]:\n    return {"status": "ok"}\n`,
    },
    {
      path: 'tests/test_main.py',
      content: `from fastapi.testclient import TestClient\nfrom src.main import app\n\nclient = TestClient(app)\n\n\ndef test_health():\n    response = client.get("/health")\n    assert response.status_code == 200\n    assert response.json() == {"status": "ok"}\n`,
    },
  ];
}

function tsLibraryTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          main: './dist/index.js',
          types: './dist/index.d.ts',
          files: ['dist'],
          scripts: {
            build: 'tsup src/index.ts --format esm --dts --clean',
            dev: 'tsup src/index.ts --format esm --dts --watch',
            lint: 'eslint src/',
            test: 'jest',
            'type-check': 'tsc --noEmit',
            prepublishOnly: 'npm run build',
          },
          devDependencies: {
            typescript: '^5.7.0',
            tsup: '^8.0.0',
            jest: '^29.0.0',
            eslint: '^9.0.0',
            '@types/node': '^22.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/index.ts',
      content: `export function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n`,
    },
    {
      path: 'tests/index.test.ts',
      content: `import { greet } from '../src/index';\n\ntest('greet returns greeting', () => {\n  expect(greet('World')).toBe('Hello, World!');\n});\n`,
    },
  ];
}

function cliTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          bin: { [name]: './dist/index.js' },
          files: ['dist'],
          scripts: {
            build: 'tsup src/index.ts --format esm --dts --clean',
            dev: 'tsx src/index.ts',
            lint: 'eslint src/',
            test: 'jest',
            'type-check': 'tsc --noEmit',
          },
          dependencies: {
            '@clack/prompts': '^0.7.0',
            picocolors: '^1.1.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            tsup: '^8.0.0',
            tsx: '^4.0.0',
            jest: '^29.0.0',
            '@types/node': '^22.0.0',
          },
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: 'src/index.ts',
      content: `#!/usr/bin/env node\nimport * as p from '@clack/prompts';\nimport pc from 'picocolors';\n\nasync function main() {\n  p.intro(pc.bold('${name}'));\n  p.outro('Done!');\n}\n\nmain();\n`,
    },
  ];
}

const TEMPLATES: Record<TemplateId, (name: string) => TemplateFile[]> = {
  'nextjs-app': nextjsTemplate,
  'express-api': expressTemplate,
  'fastapi-service': fastapiTemplate,
  'ts-library': tsLibraryTemplate,
  'cli-tool': cliTemplate,
};

export const TEMPLATE_LIST: { id: TemplateId; description: string }[] = [
  { id: 'nextjs-app', description: 'Next.js App Router with TypeScript' },
  { id: 'express-api', description: 'Express API with Zod validation' },
  { id: 'fastapi-service', description: 'FastAPI service with pytest' },
  { id: 'ts-library', description: 'TypeScript library with tsup' },
  { id: 'cli-tool', description: 'CLI tool with @clack/prompts' },
];

export function scaffold(opts: ScaffoldOptions): ScaffoldResult {
  const templateFn = TEMPLATES[opts.template];
  if (!templateFn) {
    throw new Error(`Unknown template: ${opts.template}`);
  }

  const projectDir = join(opts.dir, opts.name);
  if (existsSync(projectDir)) {
    throw new Error(`Directory already exists: ${projectDir}`);
  }

  const files = templateFn(opts.name);
  const created: string[] = [];

  for (const file of files) {
    const fullPath = join(projectDir, file.path);
    const parent = fullPath.substring(0, fullPath.lastIndexOf('/'));
    mkdirSync(parent, { recursive: true });
    writeFileSync(fullPath, file.content);
    created.push(file.path);
  }

  return { created, template: opts.template, projectDir };
}
