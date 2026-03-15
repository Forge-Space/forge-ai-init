import { generateSkills } from '../../src/generators/skills.js';
import type { DetectedStack } from '../../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: true,
  hasCi: true,
};

describe('generateSkills', () => {
  it('returns empty map for lite tier', () => {
    const skills = generateSkills(baseStack, 'lite');
    expect(skills.size).toBe(0);
  });

  it('generates 4 standard skills', () => {
    const skills = generateSkills(baseStack, 'standard');
    expect(skills.size).toBe(4);
    expect(skills.has('quality-gate/SKILL.md')).toBe(true);
    expect(skills.has('security-check/SKILL.md')).toBe(true);
    expect(skills.has('code-conscience/SKILL.md')).toBe(true);
    expect(skills.has('test-autogen/SKILL.md')).toBe(true);
  });

  it('generates 8 enterprise skills', () => {
    const skills = generateSkills(baseStack, 'enterprise');
    expect(skills.size).toBe(8);
    expect(skills.has('arch-review/SKILL.md')).toBe(true);
    expect(skills.has('test-first/SKILL.md')).toBe(true);
    expect(skills.has('dependency-audit/SKILL.md')).toBe(true);
    expect(skills.has('scalability-review/SKILL.md')).toBe(true);
  });

  it('adds migration skills when migrate is true', () => {
    const skills = generateSkills(baseStack, 'standard', true);
    expect(skills.has('migration-audit/SKILL.md')).toBe(true);
    expect(skills.has('tech-debt-review/SKILL.md')).toBe(true);
    expect(skills.has('dependency-audit/SKILL.md')).toBe(true);
    expect(skills.size).toBe(7);
  });

  it('does not duplicate dependency-audit for enterprise+migrate', () => {
    const skills = generateSkills(baseStack, 'enterprise', true);
    expect(skills.has('dependency-audit/SKILL.md')).toBe(true);
    expect(skills.size).toBe(10);
  });

  it('skill content includes SKILL.md headers', () => {
    const skills = generateSkills(baseStack, 'standard');
    const qg = skills.get('quality-gate/SKILL.md')!;
    expect(qg).toContain('Quality Gate');
    expect(qg.length).toBeGreaterThan(50);
  });

  it('skill content adapts to stack', () => {
    const pyStack: DetectedStack = {
      ...baseStack,
      language: 'python',
      packageManager: 'pip',
    };
    const skills = generateSkills(pyStack, 'standard');
    const qg = skills.get('quality-gate/SKILL.md')!;
    expect(qg).toBeDefined();
  });
});
