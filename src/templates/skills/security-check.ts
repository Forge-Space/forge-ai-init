import type { DetectedStack } from '../../types.js';

export function securityCheckSkill(stack: DetectedStack): string {
  const auditCmd =
    stack.language === 'python' ? 'pip audit' : 'npm audit';

  return `---
name: security-check
description: OWASP validation, dependency audit, and secret detection
---

# Security Check

Comprehensive security validation for code changes.

## When to Use

- Before merging PRs that touch auth, payments, or user data
- After adding new dependencies
- Periodically as part of maintenance

## Checks

1. **Dependency Audit**: \`${auditCmd}\`
   - Block on high/critical vulnerabilities
   - Warn on moderate vulnerabilities

2. **Secret Detection**: Scan for hardcoded credentials
   - API keys, tokens, passwords in source code
   - .env files not in .gitignore
   - Connection strings with embedded credentials

3. **OWASP Top 10 Review**:
   - Injection (SQL, command, XSS)
   - Broken authentication
   - Sensitive data exposure
   - Security misconfiguration
   - Using components with known vulnerabilities

4. **Input Validation**:
   - All API endpoints validate input
   - User-supplied data is sanitized before rendering
   - File uploads are type-checked and size-limited

## Process

1. Run dependency audit
2. Scan for hardcoded secrets (grep patterns)
3. Review changed files for OWASP issues
4. Report findings by severity (critical > high > medium > low)
`;
}
