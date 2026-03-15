import type { Rule } from '../scanner.js';

export const asyncRules: Rule[] = [
  {
    pattern: /new Promise\s*\(\s*(?:async|(?:\([^)]*\)\s*=>))/g,
    category: 'async',
    severity: 'high',
    rule: 'promise-constructor-async',
    message:
      'Async function inside Promise constructor — use async/await directly',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    pattern: /\.then\s*\([\s\S]*?\)\s*\.then\s*\([\s\S]*?\)\s*\.then/g,
    category: 'async',
    severity: 'medium',
    rule: 'promise-chain',
    message: 'Deep promise chain — refactor to async/await',
  },
  {
    pattern: /(?:setTimeout|setInterval)\s*\([^,]+,\s*0\s*\)/g,
    category: 'async',
    severity: 'medium',
    rule: 'setTimeout-zero',
    message: 'setTimeout(fn, 0) — use queueMicrotask or proper async',
  },
  {
    pattern: /go\s+func\s*\(/g,
    category: 'async',
    severity: 'medium',
    rule: 'go-goroutine-leak',
    message: 'Anonymous goroutine — ensure proper lifecycle management and error handling',
    extensions: ['.go'],
  },
];
