import { securityRules } from '../../src/rules/security.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('securityRules', () => {
  it('has exact rule count', () => {
    expect(securityRules).toHaveLength(45);
  });

  it('has no duplicate rule IDs', () => {
    const ids = securityRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of securityRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of securityRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category security', () => {
    for (const rule of securityRules) {
      expect(rule.category).toBe('security');
    }
  });
});
