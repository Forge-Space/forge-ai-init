import { typeSafetyRules } from '../../src/rules/type-safety.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('typeSafetyRules', () => {
  it('has exact rule count', () => {
    expect(typeSafetyRules).toHaveLength(5);
  });

  it('has no duplicate rule IDs', () => {
    const ids = typeSafetyRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of typeSafetyRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of typeSafetyRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category type-safety', () => {
    for (const rule of typeSafetyRules) {
      expect(rule.category).toBe('type-safety');
    }
  });
});
