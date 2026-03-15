import type { Rule } from '../scanner.js';

export const securityRules: Rule[] = [
  {
    pattern:
      /(?:password|secret|api_key|apiKey|token)\s*[:=]\s*["'`][^"'`]{4,}["'`]/gi,
    category: 'security',
    severity: 'critical',
    rule: 'hardcoded-secret',
    message: 'Possible hardcoded secret — use environment variables',
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    category: 'security',
    severity: 'high',
    rule: 'unsafe-html',
    message: 'dangerouslySetInnerHTML — XSS risk',
    extensions: ['.tsx', '.jsx'],
  },
  {
    pattern: /eval\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'eval-usage',
    message: 'eval() — code injection risk',
  },
  {
    pattern: /innerHTML\s*=/g,
    category: 'security',
    severity: 'high',
    rule: 'innerHTML-assignment',
    message: 'innerHTML assignment — XSS risk, use textContent or sanitize',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  {
    pattern:
      /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\+\s*(?:\w+|['"`])/gi,
    category: 'security',
    severity: 'critical',
    rule: 'sql-concatenation',
    message:
      'SQL string concatenation — use parameterized queries to prevent injection',
  },
  {
    pattern: /os\.system\s*\(/g,
    category: 'security',
    severity: 'critical',
    rule: 'os-system',
    message: 'os.system() — shell injection risk, use subprocess.run with shell=False',
    extensions: ['.py'],
  },
  {
    pattern: /subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True/g,
    category: 'security',
    severity: 'high',
    rule: 'subprocess-shell',
    message: 'subprocess with shell=True — shell injection risk',
    extensions: ['.py'],
  },
  {
    pattern: /from\s+pickle\s+import|import\s+pickle/g,
    category: 'security',
    severity: 'high',
    rule: 'pickle-usage',
    message: 'pickle deserialization is unsafe with untrusted data — use JSON or msgpack',
    extensions: ['.py'],
  },
  {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*\.format\s*\(/gi,
    category: 'security',
    severity: 'high',
    rule: 'sql-format-string',
    message: 'SQL with .format() — use parameterized queries to prevent injection',
    extensions: ['.py'],
  },
  {
    pattern: /\.\s*Exec\s*\(\s*["'`].*\+/g,
    category: 'security',
    severity: 'critical',
    rule: 'go-sql-concat',
    message: 'SQL concatenation in Exec — use parameterized queries',
    extensions: ['.go'],
  },
  {
    pattern: /unsafe\./g,
    category: 'security',
    severity: 'high',
    rule: 'rust-unsafe',
    message: 'unsafe block — minimize scope and document safety invariants',
    extensions: ['.rs'],
  },
];
