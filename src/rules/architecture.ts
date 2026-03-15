import type { Rule } from '../scanner.js';

export const architectureRules: Rule[] = [
  {
    pattern: /global\s+\w+/g,
    category: 'architecture',
    severity: 'medium',
    rule: 'global-variable',
    message: 'Global variable mutation — use function parameters or class state',
    extensions: ['.py'],
  },
];
