import { scanProject, type Severity } from './scanner.js';
import { loadConfig, getThreshold } from './config.js';

export interface GateResult {
  passed: boolean;
  score: number;
  grade: string;
  threshold: number;
  phase: string;
  violations: GateViolation[];
  summary: string;
}

export interface GateViolation {
  rule: string;
  severity: Severity;
  count: number;
  blocked: boolean;
}

function detectPhase(score: number, configPhase?: string): string {
  if (configPhase) return configPhase;
  if (score >= 80) return 'production';
  if (score >= 60) return 'stabilization';
  return 'foundation';
}

function getPhaseThreshold(phase: string): number {
  switch (phase) {
    case 'production': return 80;
    case 'stabilization': return 60;
    case 'foundation': return 40;
    default: return 60;
  }
}

function getBlockedSeverities(phase: string): Set<Severity> {
  switch (phase) {
    case 'production': return new Set(['critical', 'high']);
    case 'stabilization': return new Set(['critical']);
    case 'foundation': return new Set(['critical']);
    default: return new Set(['critical']);
  }
}

export function runGate(
  dir: string,
  phase?: string,
  threshold?: number,
): GateResult {
  const config = loadConfig(dir);
  const scan = scanProject(dir);

  const detectedPhase = detectPhase(
    scan.score,
    phase,
  );
  const configThreshold = getThreshold(config, 'deploy');
  const effectiveThreshold = threshold ?? configThreshold ?? getPhaseThreshold(detectedPhase);
  const blockedSeverities = getBlockedSeverities(detectedPhase);

  const violationMap = new Map<string, GateViolation>();
  for (const finding of scan.findings) {
    const existing = violationMap.get(finding.rule);
    if (existing) {
      existing.count++;
    } else {
      violationMap.set(finding.rule, {
        rule: finding.rule,
        severity: finding.severity,
        count: 1,
        blocked: blockedSeverities.has(finding.severity),
      });
    }
  }

  const violations = [...violationMap.values()].filter(
    (v) => v.blocked,
  );

  const passed = scan.score >= effectiveThreshold && violations.length === 0;

  const summary = passed
    ? `Gate PASSED: score ${scan.score} >= ${effectiveThreshold} (${detectedPhase} phase)`
    : violations.length > 0
      ? `Gate FAILED: ${violations.length} blocking violation(s) in ${detectedPhase} phase`
      : `Gate FAILED: score ${scan.score} < ${effectiveThreshold} (${detectedPhase} phase)`;

  return {
    passed,
    score: scan.score,
    grade: scan.grade,
    threshold: effectiveThreshold,
    phase: detectedPhase,
    violations,
    summary,
  };
}
