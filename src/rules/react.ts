import type { Rule } from '../scanner.js';

export const reactRules: Rule[] = [
  {
    pattern:
      /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*fetch\s*\(/g,
    category: 'react',
    severity: 'medium',
    rule: 'fetch-in-useEffect',
    message: 'Fetch in useEffect without cleanup — use a data fetching library',
    extensions: ['.tsx', '.jsx'],
  },
  {
    pattern:
      /useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState\s*<[^>]*>\s*\([^)]*\)\s*;[^;]*useState/g,
    category: 'react',
    severity: 'medium',
    rule: 'excessive-useState',
    message: '4+ useState calls — consolidate with useReducer or object state',
    extensions: ['.tsx', '.jsx'],
  },
];
