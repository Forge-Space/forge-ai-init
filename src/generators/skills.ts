import type { DetectedStack, Tier } from '../types.js';
import { qualityGateSkill } from '../templates/skills/quality-gate.js';
import { archReviewSkill } from '../templates/skills/arch-review.js';
import { securityCheckSkill } from '../templates/skills/security-check.js';
import { testFirstSkill } from '../templates/skills/test-first.js';

export function generateSkills(
  stack: DetectedStack,
  tier: Tier,
): Map<string, string> {
  const skills = new Map<string, string>();

  if (tier === 'lite') return skills;

  skills.set('quality-gate/SKILL.md', qualityGateSkill(stack));
  skills.set('security-check/SKILL.md', securityCheckSkill(stack));

  if (tier === 'enterprise') {
    skills.set('arch-review/SKILL.md', archReviewSkill());
    skills.set('test-first/SKILL.md', testFirstSkill(stack));
  }

  return skills;
}
