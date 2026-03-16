import { hardcodedValuesRules } from '../../src/rules/hardcoded-values.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('hardcodedValuesRules', () => {
  it('has exact rule count', () => {
    expect(hardcodedValuesRules).toHaveLength(1);
  });

  it('has no duplicate rule IDs', () => {
    const ids = hardcodedValuesRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of hardcodedValuesRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of hardcodedValuesRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category hardcoded-values', () => {
    for (const rule of hardcodedValuesRules) {
      expect(rule.category).toBe('hardcoded-values');
    }
  });
});
