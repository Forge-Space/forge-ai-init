import { generatePolicies } from '../../src/generators/policies.js';
import type { DetectedStack } from '../../src/types.js';

const baseStack: DetectedStack = {
  language: 'typescript',
  packageManager: 'npm',
  monorepo: false,
  hasLinting: true,
  hasTypeChecking: true,
  hasFormatting: false,
  hasCi: false,
};

describe('generatePolicies', () => {
  it('returns empty for lite tier', () => {
    expect(generatePolicies(baseStack, 'lite')).toEqual([]);
  });

  it('returns empty for standard tier', () => {
    expect(generatePolicies(baseStack, 'standard')).toEqual([]);
  });

  it('generates policies for enterprise tier', () => {
    const files = generatePolicies(baseStack, 'enterprise');
    const paths = files.map(f => f.path);

    expect(paths).toContain('.forge/policies/security.policy.json');
    expect(paths).toContain('.forge/policies/quality.policy.json');
    expect(paths).toContain('.forge/policies/compliance.policy.json');
    expect(paths).toContain('.forge/scorecard.json');
    expect(paths).toContain('.forge/features.json');
  });

  it('security policy has correct rules', () => {
    const files = generatePolicies(baseStack, 'enterprise');
    const sec = files.find(f => f.path.includes('security'));
    const policy = JSON.parse(sec!.content);

    expect(policy.id).toBe('forge-security');
    expect(policy.rules.length).toBeGreaterThanOrEqual(2);
    expect(policy.rules[0].id).toBe('sec-001');
  });

  it('adds framework policy for Next.js', () => {
    const nextStack: DetectedStack = {
      ...baseStack,
      framework: 'nextjs',
    };
    const files = generatePolicies(nextStack, 'enterprise');
    const fw = files.find(f => f.path.includes('framework'));

    expect(fw).toBeDefined();
    const policy = JSON.parse(fw!.content);
    expect(policy.rules.some((r: { id: string }) => r.id === 'fw-001')).toBe(true);
    expect(policy.rules.some((r: { id: string }) => r.id === 'fw-002')).toBe(true);
  });

  it('adds API validation rule for Express', () => {
    const expressStack: DetectedStack = {
      ...baseStack,
      framework: 'express',
    };
    const files = generatePolicies(expressStack, 'enterprise');
    const fw = files.find(f => f.path.includes('framework'));

    expect(fw).toBeDefined();
    const policy = JSON.parse(fw!.content);
    expect(policy.rules.some((r: { id: string }) => r.id === 'fw-003')).toBe(true);
  });

  it('no framework policy for plain TypeScript', () => {
    const files = generatePolicies(baseStack, 'enterprise');
    const fw = files.find(f => f.path.includes('framework'));
    expect(fw).toBeUndefined();
  });

  it('scorecard config has correct weights for Next.js', () => {
    const nextStack: DetectedStack = {
      ...baseStack,
      framework: 'nextjs',
    };
    const files = generatePolicies(nextStack, 'enterprise');
    const sc = files.find(f => f.path.includes('scorecard'));
    const config = JSON.parse(sc!.content);

    expect(config.weights.performance).toBe(30);
    expect(config.threshold).toBe(60);
  });

  it('scorecard config has higher security weight for Express', () => {
    const expressStack: DetectedStack = {
      ...baseStack,
      framework: 'express',
    };
    const files = generatePolicies(expressStack, 'enterprise');
    const sc = files.find(f => f.path.includes('scorecard'));
    const config = JSON.parse(sc!.content);

    expect(config.weights.security).toBe(35);
  });

  it('features.json is a valid seed file', () => {
    const files = generatePolicies(baseStack, 'enterprise');
    const feat = files.find(f => f.path.includes('features'));
    const config = JSON.parse(feat!.content);

    expect(config.toggles).toEqual([]);
    expect(config.version).toBe('1.0.0');
  });

  describe('migration mode', () => {
    it('generates migration policy for standard + migrate', () => {
      const files = generatePolicies(baseStack, 'standard', true);
      const paths = files.map(f => f.path);

      expect(paths).toContain('.forge/policies/migration-progressive.policy.json');
      expect(paths).toContain('.forge/scorecard.json');
    });

    it('migration policy has 6 progressive rules', () => {
      const files = generatePolicies(baseStack, 'standard', true);
      const mig = files.find(f => f.path.includes('migration-progressive'));
      const policy = JSON.parse(mig!.content);

      expect(policy.id).toBe('forge-migration-progressive');
      expect(policy.rules).toHaveLength(6);
      expect(policy.rules[0].id).toBe('mig-001');
      expect(policy.rules[5].id).toBe('mig-006');
    });

    it('migration scorecard has phased thresholds', () => {
      const files = generatePolicies(baseStack, 'standard', true);
      const sc = files.find(f => f.path.includes('scorecard'));
      const config = JSON.parse(sc!.content);

      expect(config.threshold).toBe(40);
      expect(config.phases.initial.threshold).toBe(40);
      expect(config.phases.stabilization.threshold).toBe(60);
      expect(config.phases.production.threshold).toBe(80);
      expect(config.migration.requireCharacterizationTests).toBe(true);
    });

    it('enterprise + migrate uses migration scorecard', () => {
      const files = generatePolicies(baseStack, 'enterprise', true);
      const sc = files.find(f => f.path.includes('scorecard'));
      const config = JSON.parse(sc!.content);

      expect(config.threshold).toBe(40);
      expect(config.phases).toBeDefined();
    });

    it('enterprise + migrate includes both enterprise and migration policies', () => {
      const files = generatePolicies(baseStack, 'enterprise', true);
      const paths = files.map(f => f.path);

      expect(paths).toContain('.forge/policies/security.policy.json');
      expect(paths).toContain('.forge/policies/quality.policy.json');
      expect(paths).toContain('.forge/policies/migration-progressive.policy.json');
    });

    it('lite + migrate generates migration policy only', () => {
      const files = generatePolicies(baseStack, 'lite', true);
      const paths = files.map(f => f.path);

      expect(paths).toContain('.forge/policies/migration-progressive.policy.json');
      expect(paths).toContain('.forge/scorecard.json');
      expect(paths).not.toContain('.forge/policies/security.policy.json');
    });
  });
});
