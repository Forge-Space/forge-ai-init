import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedStack } from './types.js';
import { scanProject, type ScanReport } from './scanner.js';
import { loadBaseline } from './baseline.js';

export interface HealthReport {
  score: number;
  grade: string;
  checks: HealthCheck[];
  trend: TrendInfo | null;
  couplingScore: number;
  complexityScore: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  category: 'architecture' | 'quality' | 'security' | 'testing' | 'governance';
}

export interface TrendInfo {
  direction: 'improving' | 'stable' | 'degrading';
  scoreDelta: number;
  snapshots: number;
}

function checkArchitecture(
  scan: ScanReport,
): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const godFiles = scan.findings.filter((f) => f.rule === 'god-file');
  const sprawl = scan.findings.filter((f) => f.rule === 'function-sprawl');

  checks.push({
    name: 'No god files (>500 lines)',
    status: godFiles.length === 0 ? 'pass' : 'fail',
    message: godFiles.length === 0
      ? 'All files under 500 lines'
      : `${godFiles.length} god file(s) found`,
    category: 'architecture',
  });

  checks.push({
    name: 'No function sprawl (>15 functions)',
    status: sprawl.length === 0 ? 'pass' : sprawl.length < 3 ? 'warn' : 'fail',
    message: sprawl.length === 0
      ? 'All files have focused responsibilities'
      : `${sprawl.length} file(s) with too many functions`,
    category: 'architecture',
  });

  return checks;
}

function checkSecurity(scan: ScanReport): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const critical = scan.findings.filter((f) => f.severity === 'critical');
  const securityFindings = scan.findings.filter((f) => f.category === 'security');

  checks.push({
    name: 'No critical findings',
    status: critical.length === 0 ? 'pass' : 'fail',
    message: critical.length === 0
      ? 'Zero critical-severity findings'
      : `${critical.length} critical finding(s) require immediate attention`,
    category: 'security',
  });

  checks.push({
    name: 'No security vulnerabilities',
    status: securityFindings.length === 0 ? 'pass' : securityFindings.length < 3 ? 'warn' : 'fail',
    message: securityFindings.length === 0
      ? 'No security issues detected'
      : `${securityFindings.length} security finding(s)`,
    category: 'security',
  });

  return checks;
}

function checkGovernance(
  dir: string,
  stack: DetectedStack,
): HealthCheck[] {
  const checks: HealthCheck[] = [];

  checks.push({
    name: 'CI/CD pipeline configured',
    status: stack.hasCi ? 'pass' : 'fail',
    message: stack.hasCi
      ? `Using ${stack.ciProvider ?? 'CI'}`
      : 'No CI/CD — add automated validation pipeline',
    category: 'governance',
  });

  checks.push({
    name: 'Linting enabled',
    status: stack.hasLinting ? 'pass' : 'fail',
    message: stack.hasLinting
      ? 'Linter configured'
      : 'No linter — add ESLint/Ruff/golangci-lint',
    category: 'governance',
  });

  checks.push({
    name: 'Type checking enabled',
    status: stack.hasTypeChecking ? 'pass' : 'warn',
    message: stack.hasTypeChecking
      ? 'Type checker configured'
      : 'No type checking — runtime errors likely',
    category: 'governance',
  });

  const hasClaudeMd = existsSync(join(dir, 'CLAUDE.md'));
  checks.push({
    name: 'AI governance rules (CLAUDE.md)',
    status: hasClaudeMd ? 'pass' : 'warn',
    message: hasClaudeMd
      ? 'AI coding rules defined'
      : 'No CLAUDE.md — AI tools lack project context',
    category: 'governance',
  });

  const hasArchDoc = existsSync(join(dir, 'ARCHITECTURE.md'));
  checks.push({
    name: 'Architecture documentation',
    status: hasArchDoc ? 'pass' : 'warn',
    message: hasArchDoc
      ? 'Architecture documented'
      : 'No ARCHITECTURE.md — knowledge siloed in developers',
    category: 'governance',
  });

  return checks;
}

function checkQuality(scan: ScanReport): HealthCheck[] {
  const checks: HealthCheck[] = [];

  checks.push({
    name: 'Quality score above 60',
    status: scan.score >= 60 ? 'pass' : scan.score >= 40 ? 'warn' : 'fail',
    message: `Score: ${scan.score}/100 (${scan.grade})`,
    category: 'quality',
  });

  const errorHandling = scan.findings.filter(
    (f) => f.category === 'error-handling',
  );
  checks.push({
    name: 'Error handling patterns',
    status: errorHandling.length === 0 ? 'pass' : errorHandling.length < 5 ? 'warn' : 'fail',
    message: errorHandling.length === 0
      ? 'Clean error handling'
      : `${errorHandling.length} error-handling issue(s)`,
    category: 'quality',
  });

  return checks;
}

function analyzeTrend(dir: string): TrendInfo | null {
  const data = loadBaseline(dir);
  if (!data || data.history.length < 2) return null;

  const latest = data.history[data.history.length - 1]!;
  const previous = data.history[data.history.length - 2]!;
  const delta = latest.score - previous.score;

  return {
    direction: delta > 2 ? 'improving' : delta < -2 ? 'degrading' : 'stable',
    scoreDelta: delta,
    snapshots: data.history.length,
  };
}

function calculateCouplingScore(scan: ScanReport): number {
  const couplingFindings = scan.findings.filter(
    (f) => f.rule === 'god-file' || f.rule === 'function-sprawl',
  );
  return Math.max(0, 100 - couplingFindings.length * 10);
}

function calculateComplexityScore(scan: ScanReport): number {
  const totalFindings = scan.findings.length;
  if (totalFindings === 0) return 100;
  return Math.max(0, 100 - Math.round(totalFindings * 1.5));
}

export function runDoctor(
  dir: string,
  stack: DetectedStack,
): HealthReport {
  const scan = scanProject(dir);

  const checks = [
    ...checkArchitecture(scan),
    ...checkSecurity(scan),
    ...checkGovernance(dir, stack),
    ...checkQuality(scan),
  ];

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const score = Math.round((passCount / checks.length) * 100);
  const grade =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return {
    score,
    grade,
    checks,
    trend: analyzeTrend(dir),
    couplingScore: calculateCouplingScore(scan),
    complexityScore: calculateComplexityScore(scan),
  };
}
