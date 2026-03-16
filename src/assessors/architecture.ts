import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { AssessmentFinding } from './types.js';

interface FileMetrics {
  path: string;
  lines: number;
  functions: number;
  imports: number;
}

export function collectArchitectureFindings(
  dir: string,
  files: string[],
): AssessmentFinding[] {
  const findings: AssessmentFinding[] = [];
  const metrics: FileMetrics[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const relPath = relative(dir, file);
    const lines = content.split('\n');
    const fnMatch = content.match(
      /(?:function\s+\w+|(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(|def\s+\w+|func\s+\w+|fn\s+\w+)/g,
    );
    const importMatch = content.match(
      /(?:^import\s|^from\s|^require\(|^const\s.*=\s*require\()/gm,
    );

    metrics.push({
      path: relPath,
      lines: lines.length,
      functions: fnMatch?.length ?? 0,
      imports: importMatch?.length ?? 0,
    });
  }

  const godFiles = metrics.filter((m) => m.lines > 500);
  for (const f of godFiles.slice(0, 5)) {
    findings.push({
      category: 'architecture',
      severity: f.lines > 1000 ? 'critical' : 'high',
      title: 'God file',
      detail: `${f.path}: ${f.lines} lines — split into modules`,
      file: f.path,
      line: 1,
    });
  }

  const highCoupling = metrics.filter((m) => m.imports > 15);
  for (const f of highCoupling.slice(0, 5)) {
    findings.push({
      category: 'architecture',
      severity: 'high',
      title: 'High coupling',
      detail: `${f.path}: ${f.imports} imports`,
      file: f.path,
      line: 1,
    });
  }

  const sprawl = metrics.filter((m) => m.functions > 20);
  for (const f of sprawl.slice(0, 5)) {
    findings.push({
      category: 'architecture',
      severity: 'high',
      title: 'Function sprawl',
      detail: `${f.path}: ${f.functions} functions`,
      file: f.path,
      line: 1,
    });
  }

  const totalFiles = metrics.length;
  const avgLines =
    totalFiles > 0
      ? Math.round(metrics.reduce((s, m) => s + m.lines, 0) / totalFiles)
      : 0;

  if (avgLines > 200) {
    findings.push({
      category: 'architecture',
      severity: 'medium',
      title: 'High average file size',
      detail: `Average ${avgLines} lines — consider decomposition`,
    });
  }

  const dirs = new Set(
    metrics.map((m) => m.path.split('/').slice(0, -1).join('/')),
  );
  if (dirs.size < 3 && totalFiles > 20) {
    findings.push({
      category: 'architecture',
      severity: 'medium',
      title: 'Flat directory structure',
      detail: `${totalFiles} files in ${dirs.size} dirs — no modular organization`,
    });
  }

  return findings;
}
