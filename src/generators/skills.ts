import type { DetectedStack, Tier } from '../types.js';
import { qualityGateSkill } from '../templates/skills/quality-gate.js';
import { archReviewSkill } from '../templates/skills/arch-review.js';
import { securityCheckSkill } from '../templates/skills/security-check.js';
import { testFirstSkill } from '../templates/skills/test-first.js';
import { codeConscienceSkill } from '../templates/skills/code-conscience.js';
import { migrationAuditSkill } from '../templates/skills/migration-audit.js';
import { techDebtReviewSkill } from '../templates/skills/tech-debt-review.js';
import { dependencyAuditSkill } from '../templates/skills/dependency-audit.js';
import { scalabilityReviewSkill } from '../templates/skills/scalability-review.js';
import { testAutogenSkill } from '../templates/skills/test-autogen.js';

export function generateSkills(
  stack: DetectedStack,
  tier: Tier,
  migrate?: boolean,
): Map<string, string> {
  const skills = new Map<string, string>();

  if (tier === 'lite') return skills;

  skills.set('quality-gate/SKILL.md', qualityGateSkill(stack));
  skills.set('security-check/SKILL.md', securityCheckSkill(stack));
  skills.set('code-conscience/SKILL.md', codeConscienceSkill());
  skills.set('test-autogen/SKILL.md', testAutogenSkill(stack));

  if (tier === 'enterprise') {
    skills.set('arch-review/SKILL.md', archReviewSkill());
    skills.set('test-first/SKILL.md', testFirstSkill(stack));
    skills.set(
      'dependency-audit/SKILL.md',
      dependencyAuditSkill(),
    );
    skills.set(
      'scalability-review/SKILL.md',
      scalabilityReviewSkill(),
    );
  }

  if (migrate) {
    skills.set(
      'migration-audit/SKILL.md',
      migrationAuditSkill(),
    );
    skills.set(
      'tech-debt-review/SKILL.md',
      techDebtReviewSkill(),
    );
    if (tier !== 'enterprise') {
      skills.set(
        'dependency-audit/SKILL.md',
        dependencyAuditSkill(),
      );
    }
  }

  return skills;
}
