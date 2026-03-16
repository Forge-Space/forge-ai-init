import type { DetectedStack } from '../types.js';
import type { ScanReport } from '../scanner.js';
import type { ArchRisk, ProjectStructure } from './types.js';

export function detectRisks(
  stack: DetectedStack,
  scan: ScanReport,
  structure: ProjectStructure,
): ArchRisk[] {
  const risks: ArchRisk[] = [];

  if (structure.testRatio < 20) {
    risks.push({
      area: 'testing',
      severity: 'critical',
      description: `Test ratio is ${structure.testRatio}% — insufficient safety net for changes`,
      mitigation: 'Add characterization tests before any refactoring',
    });
  }

  if (!stack.hasTypeChecking) {
    risks.push({
      area: 'type-safety',
      severity: 'high',
      description: 'No type checking — runtime errors likely in production',
      mitigation: 'Adopt TypeScript incrementally or add mypy/pyright',
    });
  }

  if (!stack.hasLinting) {
    risks.push({
      area: 'code-quality',
      severity: 'medium',
      description: 'No linter configured — inconsistent code patterns',
      mitigation: 'Add ESLint/Ruff/golangci-lint with strict rules',
    });
  }

  if (!stack.hasCi) {
    risks.push({
      area: 'ci-cd',
      severity: 'high',
      description: 'No CI/CD — bugs ship without automated validation',
      mitigation: 'Add GitHub Actions or GitLab CI with lint + test + build',
    });
  }

  const securityFindings = scan.findings.filter(
    (f) => f.category === 'security',
  );
  if (securityFindings.length > 0) {
    risks.push({
      area: 'security',
      severity: 'critical',
      description: `${securityFindings.length} security findings (SQL injection, hardcoded secrets, etc.)`,
      mitigation: 'Fix all critical/high security findings before new features',
    });
  }

  const archFindings = scan.findings.filter(
    (f) => f.category === 'architecture',
  );
  if (archFindings.length > 5) {
    risks.push({
      area: 'architecture',
      severity: 'high',
      description: `${archFindings.length} architecture issues (god files, function sprawl)`,
      mitigation: 'Decompose large modules, extract shared logic',
    });
  }

  if (scan.score < 40) {
    risks.push({
      area: 'overall-quality',
      severity: 'critical',
      description: `Quality score ${scan.score}/100 (grade ${scan.grade}) — high technical debt`,
      mitigation: 'Stabilize before adding features: fix critical findings first',
    });
  }

  return risks;
}
