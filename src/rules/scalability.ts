import type { Rule } from '../scanner.js';

export const scalabilityRules: Rule[] = [
  {
    pattern: /import\s+\w+\s+from\s+['"]lodash['"]/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'lodash-full-import',
    message: 'Full lodash import — use lodash/specific or lodash-es for tree-shaking',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
  },
  {
    pattern: /var\s+\w+\s+sync\.Mutex/g,
    category: 'scalability',
    severity: 'medium',
    rule: 'go-global-mutex',
    message: 'Global mutex — consider channel-based concurrency or sync.RWMutex',
    extensions: ['.go'],
  },
  {
    pattern: /\.clone\s*\(\s*\)/g,
    category: 'scalability',
    severity: 'low',
    rule: 'rust-clone',
    message: '.clone() copies data — consider borrowing or Arc for shared ownership',
    extensions: ['.rs'],
  },
];
