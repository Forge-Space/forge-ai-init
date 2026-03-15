import type { Rule } from '../scanner.js';

export const hardcodedValuesRules: Rule[] = [
  {
    pattern:
      /["'`]https?:\/\/(?!localhost|127\.0\.0\.1|example\.com)[a-z0-9.-]+\.[a-z]{2,}[^"'`]*["'`]/gi,
    category: 'hardcoded-values',
    severity: 'medium',
    rule: 'hardcoded-url',
    message: 'Hardcoded URL — use environment variables or config',
  },
];
