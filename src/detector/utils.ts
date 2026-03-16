import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../shared.js';

export function fileExists(dir: string, ...names: string[]): boolean {
  return names.some((n) => existsSync(join(dir, n)));
}

export function collectWorkspaceDeps(
  dir: string,
  pkg: Record<string, unknown> | null,
): Record<string, string> {
  const rootDeps: Record<string, string> = {
    ...((pkg?.['dependencies'] ?? {}) as Record<string, string>),
    ...((pkg?.['devDependencies'] ?? {}) as Record<string, string>),
  };

  const workspaces = pkg?.['workspaces'];
  if (!workspaces) return rootDeps;

  const patterns: string[] = Array.isArray(workspaces)
    ? workspaces
    : (workspaces as Record<string, string[]>)?.['packages'] ?? [];

  for (const pattern of patterns) {
    const wsDir = join(dir, pattern.replace('/*', ''));
    if (!existsSync(wsDir)) continue;
    try {
      const entries = readdirSync(wsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const wsPkg = readJson(join(wsDir, entry.name, 'package.json'));
        if (wsPkg) {
          Object.assign(
            rootDeps,
            (wsPkg['dependencies'] ?? {}) as Record<string, string>,
            (wsPkg['devDependencies'] ?? {}) as Record<string, string>,
          );
        }
      }
    } catch {
      // ignore
    }
  }

  return rootDeps;
}

export function findFileRecursive(
  dir: string,
  name: string,
  maxDepth = 2,
): boolean {
  if (existsSync(join(dir, name))) return true;
  if (maxDepth <= 0) return false;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      ) {
        if (findFileRecursive(join(dir, entry.name), name, maxDepth - 1))
          return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function hasKotlinSources(dir: string): boolean {
  const srcDir = join(dir, 'src');
  if (!existsSync(srcDir)) return false;
  try {
    const entries = readdirSync(srcDir, { withFileTypes: true, recursive: true });
    return entries.some((e) => e.name.endsWith('.kt') || e.name.endsWith('.kts'));
  } catch {
    return false;
  }
}
