import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function gradeIcon(grade: string): string {
  switch (grade) {
    case 'A': return '🟢';
    case 'B': return '🔵';
    case 'C': return '🟡';
    case 'D': return '🟠';
    default: return '🔴';
  }
}

export function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    default: return '🔵';
  }
}

export function categoryLabel(cat: string): string {
  return cat.split('-').map(
    w => w.charAt(0).toUpperCase() + w.slice(1),
  ).join(' ');
}

export function sarifLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    default:
      return 'note';
  }
}

export function getVersion(): string {
  try {
    const thisDir = fileURLToPath(new URL('.', import.meta.url));
    const pkg = JSON.parse(readFileSync(join(thisDir, '..', '..', 'package.json'), 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
