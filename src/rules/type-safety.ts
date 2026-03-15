import type { Rule } from '../scanner.js';

export const typeSafetyRules: Rule[] = [
  {
    pattern: /:\s*any\b/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'any-type',
    message: 'Explicit `any` type — use a specific type or `unknown`',
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /as\s+(?!const\b)\w+/g,
    category: 'type-safety',
    severity: 'low',
    rule: 'type-assertion',
    message: 'Type assertion — prefer type narrowing with guards',
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /!\./g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'non-null-assertion',
    message: 'Non-null assertion (!) — handle null case explicitly',
    extensions: ['.ts', '.tsx'],
  },
  {
    pattern: /from\s+typing\s+import\s+.*\bAny\b/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'python-any-type',
    message: 'typing.Any bypasses type checking — use specific types or Protocol',
    extensions: ['.py'],
  },
  {
    pattern: /interface\s*\{\s*\}/g,
    category: 'type-safety',
    severity: 'medium',
    rule: 'go-empty-interface',
    message: 'Empty interface{} loses type safety — use generics or specific types',
    extensions: ['.go'],
  },
];
