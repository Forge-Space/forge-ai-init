import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Framework } from '../types.js';
import { fileExists } from './utils.js';

export function detectFramework(
  dir: string,
  deps: Record<string, string>,
): Framework | undefined {
  if (deps['next']) return 'nextjs';
  if (deps['remix'] || deps['@remix-run/node']) return 'remix';
  if (deps['astro']) return 'astro';
  if (deps['nuxt']) return 'nuxt';
  if (deps['@sveltejs/kit']) return 'sveltekit';
  if (deps['svelte']) return 'svelte';
  if (deps['vue']) return 'vue';
  if (deps['@nestjs/core']) return 'nestjs';
  if (deps['express']) return 'express';
  if (deps['react'] || deps['react-dom']) return 'react';

  if (fileExists(dir, 'pyproject.toml', 'requirements.txt')) {
    const content = existsSync(join(dir, 'pyproject.toml'))
      ? readFileSync(join(dir, 'pyproject.toml'), 'utf-8')
      : existsSync(join(dir, 'requirements.txt'))
        ? readFileSync(join(dir, 'requirements.txt'), 'utf-8')
        : '';
    if (content.includes('fastapi')) return 'fastapi';
    if (content.includes('django')) return 'django';
    if (content.includes('flask')) return 'flask';
  }

  if (fileExists(dir, 'pom.xml')) {
    const pom = readFileSync(join(dir, 'pom.xml'), 'utf-8');
    if (pom.includes('spring-boot')) return 'spring';
  }

  return undefined;
}
