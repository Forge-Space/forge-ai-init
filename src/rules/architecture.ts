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
  {
    pattern: /from\s+\w+\s+import\s+\*/g,
    category: 'architecture',
    severity: 'medium',
    rule: 'python-star-import',
    message: 'Star import pollutes namespace — import specific names',
    extensions: ['.py'],
  },
  {
    pattern: /init\s*\(\s*\)\s*\{/g,
    category: 'architecture',
    severity: 'medium',
    rule: 'go-init-function',
    message: 'init() has implicit execution order — prefer explicit initialization',
    extensions: ['.go'],
  },
];
