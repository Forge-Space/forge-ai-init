import { asyncRules } from '../../src/rules/async.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const REQUIRED_FIELDS = ['pattern', 'category', 'severity', 'rule', 'message'] as const;

describe('asyncRules', () => {
  it('has exact rule count', () => {
    expect(asyncRules).toHaveLength(4);
  });

  it('has no duplicate rule IDs', () => {
    const ids = asyncRules.map((r) => r.rule);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of asyncRules) {
      for (const field of REQUIRED_FIELDS) {
        expect(rule).toHaveProperty(field);
      }
    }
  });

  it('all rules have valid severity', () => {
    for (const rule of asyncRules) {
      expect(VALID_SEVERITIES).toContain(rule.severity);
    }
  });

  it('all rules have category async', () => {
    for (const rule of asyncRules) {
      expect(rule.category).toBe('async');
    }
  });
});
