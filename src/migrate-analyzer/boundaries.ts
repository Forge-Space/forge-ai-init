import type { ScanReport } from '../scanner.js';
import type { StranglerBoundary } from './types.js';

export function findStranglerBoundaries(
  dir: string,
  scan: ScanReport,
): StranglerBoundary[] {
  const boundaries: StranglerBoundary[] = [];
  const fileFindings = new Map<string, number>();

  for (const f of scan.findings) {
    const count = fileFindings.get(f.file) ?? 0;
    fileFindings.set(f.file, count + 1);
  }

  const godFiles = scan.findings
    .filter((f) => f.rule === 'god-file')
    .map((f) => f.file);

  const sprawlFiles = scan.findings
    .filter((f) => f.rule === 'function-sprawl')
    .map((f) => f.file);

  for (const file of godFiles) {
    const findings = fileFindings.get(file) ?? 0;
    boundaries.push({
      module: file,
      type: detectModuleType(file),
      complexity: findings > 5 ? 'high' : findings > 2 ? 'medium' : 'low',
      reason: 'God file — too many responsibilities, high coupling risk',
      dependents: findings,
    });
  }

  for (const file of sprawlFiles) {
    if (godFiles.includes(file)) continue;
    boundaries.push({
      module: file,
      type: detectModuleType(file),
      complexity: 'medium',
      reason: 'Function sprawl — too many exports, should be decomposed',
      dependents: fileFindings.get(file) ?? 0,
    });
  }

  return boundaries.sort((a, b) => b.dependents - a.dependents);
}

export function detectModuleType(
  file: string,
): 'api' | 'service' | 'data' | 'ui' {
  const lower = file.toLowerCase();
  if (lower.includes('route') || lower.includes('controller') || lower.includes('api') || lower.includes('endpoint'))
    return 'api';
  if (lower.includes('model') || lower.includes('schema') || lower.includes('migration') || lower.includes('repo'))
    return 'data';
  if (lower.includes('component') || lower.includes('page') || lower.includes('view') || lower.includes('layout'))
    return 'ui';
  return 'service';
}
