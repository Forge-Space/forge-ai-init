import type { Rule } from '../scanner.js';

export const errorHandlingRules: Rule[] = [
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'empty-catch',
    message: 'Empty catch block swallows errors silently',
  },
  {
    pattern:
      /catch\s*\([^)]*\)\s*\{\s*console\.(log|error|warn)\([^)]*\);\s*\}/g,
    category: 'error-handling',
    severity: 'medium',
    rule: 'console-only-catch',
    message: 'Catch block only logs — errors are lost',
  },
  {
    pattern: /except\s*:/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'bare-except',
    message: 'Bare except catches all exceptions including SystemExit — catch specific exceptions',
    extensions: ['.py'],
  },
  {
    pattern: /except\s+Exception\s*(?:as\s+\w+\s*)?:\s*(?:pass|\.\.\.)/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'except-pass',
    message: 'except Exception: pass silently swallows all errors',
    extensions: ['.py'],
  },
  {
    pattern: /if\s+err\s*!=\s*nil\s*\{\s*return\s+(?:nil,\s*)?err\s*\}/g,
    category: 'error-handling',
    severity: 'medium',
    rule: 'go-bare-error-return',
    message: 'Bare error return without wrapping — use fmt.Errorf or errors.Wrap for context',
    extensions: ['.go'],
  },
  {
    pattern: /panic\s*\(/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'go-panic',
    message: 'panic() crashes the program — return errors instead',
    extensions: ['.go'],
  },
  {
    pattern: /\.unwrap\s*\(\s*\)/g,
    category: 'error-handling',
    severity: 'high',
    rule: 'rust-unwrap',
    message: '.unwrap() panics on error — use ? operator or handle the error',
    extensions: ['.rs'],
  },
  {
    pattern: /\.expect\s*\(/g,
    category: 'error-handling',
    severity: 'medium',
    rule: 'rust-expect',
    message: '.expect() panics with message — prefer ? operator in production code',
    extensions: ['.rs'],
  },
];
