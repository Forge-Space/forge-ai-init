import type { DetectedStack } from './types.js';
import { type Grade, scoreToGrade } from './shared.js';
import { checkRules } from './checkers/rules.js';
import { checkSkills } from './checkers/skills.js';
import { checkHooks } from './checkers/hooks.js';
import { checkCi } from './checkers/ci.js';
import { checkSecurity } from './checkers/security.js';
import { checkQuality } from './checkers/quality.js';
import { checkPolicies } from './checkers/policies.js';

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
  category: CheckCategory;
  weight: number;
}

export type CheckCategory =
  | 'rules'
  | 'skills'
  | 'hooks'
  | 'ci'
  | 'security'
  | 'quality'
  | 'policies';

export interface AuditReport {
  checks: CheckResult[];
  score: number;
  grade: Grade;
  summary: CategorySummary[];
}

export interface CategorySummary {
  category: CheckCategory;
  passed: number;
  total: number;
  label: string;
}

const LABELS: Record<CheckCategory, string> = {
  rules: 'AI Rules', skills: 'Skills', hooks: 'Hooks & Safety',
  ci: 'CI/CD', security: 'Security', quality: 'Code Quality', policies: 'Policies',
};

export function runAudit(dir: string, stack: DetectedStack): AuditReport {
  const checks = [
    ...checkRules(dir), ...checkSkills(dir), ...checkHooks(dir),
    ...checkCi(dir, stack), ...checkSecurity(dir), ...checkQuality(dir, stack),
    ...checkPolicies(dir),
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks.reduce(
    (s, c) => s + (c.status === 'pass' ? c.weight : c.status === 'warn' ? c.weight * 0.5 : 0),
    0,
  );

  const score = Math.round((earnedWeight / totalWeight) * 100);
  const grade = scoreToGrade(score);

  const categories = [...new Set(checks.map((c) => c.category))] as CheckCategory[];
  const summary = categories.map((cat) => {
    const catChecks = checks.filter((c) => c.category === cat);
    return { category: cat, passed: catChecks.filter((c) => c.status === 'pass').length,
      total: catChecks.length, label: LABELS[cat] };
  });

  return { checks, score, grade, summary };
}
