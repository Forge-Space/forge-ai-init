import type { Rule } from '../scanner.js';

export const accessibilityRules: Rule[] = [
  {
    pattern: /<img\b[^>]*(?!alt\s*=)[^>]*\/?>/g,
    category: 'accessibility',
    severity: 'medium',
    rule: 'img-no-alt',
    message: 'Image without alt attribute — add alt text for accessibility',
  },
];
