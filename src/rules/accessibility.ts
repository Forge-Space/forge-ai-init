import type { Rule } from '../scanner.js';

export const accessibilityRules: Rule[] = [
  {
    pattern: /<img\b[^>]*(?!alt\s*=)[^>]*\/?>/g,
    category: 'accessibility',
    severity: 'medium',
    rule: 'img-no-alt',
    message: 'Image without alt attribute — add alt text for accessibility',
  },
  {
    pattern: /<button\b(?![^>]*(?:aria-label|aria-labelledby))[^>]*>\s*<(?:img|svg|icon)/gi,
    category: 'accessibility',
    severity: 'medium',
    rule: 'button-no-label',
    message: 'Icon-only button without aria-label — add accessible name',
    extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
  },
  {
    pattern: /<input\b(?![^>]*(?:aria-label|aria-labelledby|id\s*=))[^>]*\/?>/gi,
    category: 'accessibility',
    severity: 'medium',
    rule: 'input-no-label',
    message: 'Input without label association — add aria-label or matching <label htmlFor>',
    extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
  },
];
