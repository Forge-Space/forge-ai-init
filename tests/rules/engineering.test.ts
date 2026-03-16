import { engineeringRules } from '../../src/rules/engineering.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('engineeringRules', () => {
  it('has exact rule count', () => {
    expect(engineeringRules).toHaveLength(27);
  });

  it('has no duplicate rule IDs', () => {
    const ids = engineeringRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of engineeringRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of engineeringRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category engineering', () => {
    for (const rule of engineeringRules) {
      expect(rule.category).toBe('engineering');
    }
  });
});
