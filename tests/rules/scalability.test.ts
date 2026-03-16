import { scalabilityRules } from '../../src/rules/scalability.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('scalabilityRules', () => {
  it('has exact rule count', () => {
    expect(scalabilityRules).toHaveLength(10);
  });

  it('has no duplicate rule IDs', () => {
    const ids = scalabilityRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of scalabilityRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of scalabilityRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category scalability', () => {
    for (const rule of scalabilityRules) {
      expect(rule.category).toBe('scalability');
    }
  });
});
