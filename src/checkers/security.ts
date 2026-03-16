import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult } from '../checker.js';

function fileExists(dir: string, ...paths: string[]): boolean {
  return existsSync(join(dir, ...paths));
}

function fileContains(dir: string, path: string, text: string): boolean {
  const full = join(dir, path);
  if (!existsSync(full)) return false;
  try {
    return readFileSync(full, 'utf-8').includes(text);
  } catch {
    return false;
  }
}

export function checkSecurity(dir: string): CheckResult[] {
  const results: CheckResult[] = [];

  const hasGitignore = fileExists(dir, '.gitignore');
  let envIgnored = false;
  if (hasGitignore) {
    envIgnored = fileContains(dir, '.gitignore', '.env');
  }

  results.push({
    name: '.env protection',
    status: envIgnored ? 'pass' : 'warn',
    detail: envIgnored
      ? '.env files excluded from git'
      : '.env not in .gitignore — secrets may be committed',
    category: 'security',
    weight: 3,
  });

  const hasSecurityMd = fileExists(dir, 'SECURITY.md');
  results.push({
    name: 'Security policy',
    status: hasSecurityMd ? 'pass' : 'warn',
    detail: hasSecurityMd
      ? 'SECURITY.md found'
      : 'No SECURITY.md — no vulnerability disclosure process',
    category: 'security',
    weight: 1,
  });

  const hasMcpConfig = fileExists(dir, '.mcp.json');
  results.push({
    name: 'MCP configuration',
    status: hasMcpConfig ? 'pass' : 'warn',
    detail: hasMcpConfig
      ? 'MCP servers configured for AI tools'
      : 'No .mcp.json — AI tools lack context servers',
    category: 'security',
    weight: 1,
  });

  return results;
}
