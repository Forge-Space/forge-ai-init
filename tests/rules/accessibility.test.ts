import { accessibilityRules } from '../../src/rules/accessibility.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('accessibilityRules', () => {
  it('has exact rule count', () => {
    expect(accessibilityRules).toHaveLength(3);
  });

  it('has no duplicate rule IDs', () => {
    const ids = accessibilityRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of accessibilityRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of accessibilityRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category accessibility', () => {
    for (const rule of accessibilityRules) {
      expect(rule.category).toBe('accessibility');
    }
  });
});
