import { errorHandlingRules } from '../../src/rules/error-handling.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('errorHandlingRules', () => {
  it('has exact rule count', () => {
    expect(errorHandlingRules).toHaveLength(14);
  });

  it('has no duplicate rule IDs', () => {
    const ids = errorHandlingRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of errorHandlingRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of errorHandlingRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category error-handling', () => {
    for (const rule of errorHandlingRules) {
      expect(rule.category).toBe('error-handling');
    }
  });
});
