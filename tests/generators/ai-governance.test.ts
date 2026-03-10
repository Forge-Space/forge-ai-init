import {
  generateClaudeMd,
  generateCursorRules,
  generateCopilotInstructions,
} from '../../src/generators/claude-md.js';
import { generateSkills } from '../../src/generators/skills.js';
import type { DetectedStack } from '../../src/types.js';

function makeStack(
  overrides: Partial<DetectedStack> = {},
): DetectedStack {
  return {
    language: 'typescript',
    packageManager: 'npm',
    monorepo: false,
    hasLinting: true,
    hasTypeChecking: true,
    hasFormatting: true,
    hasCi: true,
    ciProvider: 'github-actions',
    buildCommand: 'npm run build',
    testCommand: 'npm run test',
    lintCommand: 'npm run lint',
    ...overrides,
  };
}

describe('AI Governance rules', () => {
  it('includes AI Code Governance in all CLAUDE.md output', () => {
    const md = generateClaudeMd(makeStack(), 'lite');
    expect(md).toContain('## AI Code Governance');
    expect(md).toContain('NEVER accept AI-generated code');
  });

  it('includes AI Anti-Patterns in all tiers', () => {
    const md = generateClaudeMd(makeStack(), 'lite');
    expect(md).toContain('## AI Anti-Patterns to Block');
    expect(md).toContain('Copy-paste proliferation');
    expect(md).toContain('Shallow error handling');
  });

  it('includes AI governance in cursor rules', () => {
    const rules = generateCursorRules(makeStack(), 'standard');
    expect(rules).toContain('## AI Code Governance');
    expect(rules).toContain('## AI Anti-Patterns to Block');
  });

  it('includes AI governance in copilot instructions', () => {
    const md = generateCopilotInstructions(
      makeStack(),
      'standard',
    );
    expect(md).toContain('## AI Code Governance');
  });

  it('includes scalability rules for standard tier', () => {
    const md = generateClaudeMd(makeStack(), 'standard');
    expect(md).toContain('## Scalability & Performance');
    expect(md).toContain('Database queries');
    expect(md).toContain('Connection pooling');
  });

  it('includes scalability rules for enterprise tier', () => {
    const md = generateClaudeMd(makeStack(), 'enterprise');
    expect(md).toContain('## Scalability & Performance');
  });

  it('excludes scalability rules for lite tier', () => {
    const md = generateClaudeMd(makeStack(), 'lite');
    expect(md).not.toContain('## Scalability & Performance');
  });
});

describe('Migration mode', () => {
  it('includes migration rules when migrate=true', () => {
    const md = generateClaudeMd(
      makeStack(),
      'standard',
      true,
    );
    expect(md).toContain('## Legacy Migration Governance');
    expect(md).toContain('strangler fig pattern');
    expect(md).toContain('characterization tests');
  });

  it('excludes migration rules when migrate=false', () => {
    const md = generateClaudeMd(
      makeStack(),
      'standard',
      false,
    );
    expect(md).not.toContain('## Legacy Migration Governance');
  });

  it('includes migration rules in cursor rules', () => {
    const rules = generateCursorRules(
      makeStack(),
      'standard',
      true,
    );
    expect(rules).toContain('## Legacy Migration Governance');
  });

  it('generates migration skills when migrate=true', () => {
    const skills = generateSkills(
      makeStack(),
      'standard',
      true,
    );
    expect(skills.has('migration-audit/SKILL.md')).toBe(true);
    expect(skills.has('tech-debt-review/SKILL.md')).toBe(true);
    expect(skills.has('dependency-audit/SKILL.md')).toBe(true);
  });

  it('does not generate migration skills when migrate=false', () => {
    const skills = generateSkills(
      makeStack(),
      'standard',
      false,
    );
    expect(skills.has('migration-audit/SKILL.md')).toBe(false);
    expect(skills.has('tech-debt-review/SKILL.md')).toBe(false);
  });
});

describe('New skills', () => {
  it('includes code-conscience for standard tier', () => {
    const skills = generateSkills(makeStack(), 'standard');
    expect(skills.has('code-conscience/SKILL.md')).toBe(true);
    const content = skills.get('code-conscience/SKILL.md')!;
    expect(content).toContain('# Code Conscience');
    expect(content).toContain('Understanding Check');
    expect(content).toContain('SHIP IT');
  });

  it('includes test-autogen for standard tier', () => {
    const skills = generateSkills(makeStack(), 'standard');
    expect(skills.has('test-autogen/SKILL.md')).toBe(true);
    const content = skills.get('test-autogen/SKILL.md')!;
    expect(content).toContain('# Test Autogen');
    expect(content).toContain('test-autogen --staged --write --check');
  });

  it('includes dependency-audit for enterprise', () => {
    const skills = generateSkills(makeStack(), 'enterprise');
    expect(skills.has('dependency-audit/SKILL.md')).toBe(true);
    const content = skills.get('dependency-audit/SKILL.md')!;
    expect(content).toContain('# Dependency Audit');
    expect(content).toContain('Freshness Check');
    expect(content).toContain('License Compliance');
  });

  it('includes scalability-review for enterprise', () => {
    const skills = generateSkills(makeStack(), 'enterprise');
    expect(skills.has('scalability-review/SKILL.md')).toBe(true);
    const content = skills.get('scalability-review/SKILL.md')!;
    expect(content).toContain('# Scalability Review');
    expect(content).toContain('N+1 queries');
    expect(content).toContain('Cache hierarchy');
  });

  it('migration-audit covers all assessment areas', () => {
    const skills = generateSkills(
      makeStack(),
      'standard',
      true,
    );
    const content = skills.get('migration-audit/SKILL.md')!;
    expect(content).toContain('Codebase Health');
    expect(content).toContain('Architecture Assessment');
    expect(content).toContain('Test Coverage Gaps');
    expect(content).toContain('Security Posture');
    expect(content).toContain('Scalability Risks');
    expect(content).toContain('Migration Roadmap');
  });

  it('tech-debt-review has scoring matrix', () => {
    const skills = generateSkills(
      makeStack(),
      'standard',
      true,
    );
    const content = skills.get('tech-debt-review/SKILL.md')!;
    expect(content).toContain('Scoring Matrix');
    expect(content).toContain('Code Debt');
    expect(content).toContain('Architecture Debt');
    expect(content).toContain('Test Debt');
    expect(content).toContain('Infrastructure Debt');
  });

  it('standard tier has 4 skills', () => {
    const skills = generateSkills(makeStack(), 'standard');
    expect(skills.size).toBe(4);
  });

  it('enterprise tier has 8 skills', () => {
    const skills = generateSkills(makeStack(), 'enterprise');
    expect(skills.size).toBe(8);
  });

  it('standard + migrate has 7 skills', () => {
    const skills = generateSkills(
      makeStack(),
      'standard',
      true,
    );
    expect(skills.size).toBe(7);
  });

  it('enterprise + migrate has 10 skills', () => {
    const skills = generateSkills(
      makeStack(),
      'enterprise',
      true,
    );
    expect(skills.size).toBe(10);
  });
});
