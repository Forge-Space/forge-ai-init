import { architectureRules } from '../../src/rules/architecture.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('architectureRules', () => {
  it('has exact rule count', () => {
    expect(architectureRules).toHaveLength(3);
  });

  it('has no duplicate rule IDs', () => {
    const ids = architectureRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of architectureRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of architectureRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category architecture', () => {
    for (const rule of architectureRules) {
      expect(rule.category).toBe('architecture');
    }
  });
});
