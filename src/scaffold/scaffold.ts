import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { TemplateId, TemplateFile, ScaffoldOptions, ScaffoldResult } from './types.js';
import { nextjsTemplate } from './templates-nextjs.js';
import { expressTemplate } from './templates-express.js';
import { fastapiTemplate } from './templates-fastapi.js';
import { tsLibraryTemplate } from './templates-ts-library.js';
import { cliTemplate } from './templates-cli.js';

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
