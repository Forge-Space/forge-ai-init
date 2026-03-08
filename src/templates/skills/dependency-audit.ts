export function dependencyAuditSkill(): string {
  return `---
name: dependency-audit
description: Audit dependencies for security, freshness, and necessity
---

# Dependency Audit

## When to Use
- Before any release or deployment
- Monthly security review cycle
- When adding new dependencies
- After inheriting or forking a project
- When bundle size exceeds budget

## Audit Checks

### 1. Security Vulnerabilities
\`\`\`bash
# Node.js
npm audit --audit-level=high
npx better-npm-audit audit

# Python
pip audit
safety check

# General
npx snyk test
\`\`\`
- HIGH and CRITICAL: Must fix before release
- MODERATE: Create ticket, fix within sprint
- LOW: Track in backlog

### 2. Freshness Check
\`\`\`bash
# Node.js
npx npm-check-updates
npx depcheck

# Python
pip list --outdated
\`\`\`
- >2 major versions behind: High priority upgrade
- >1 major version behind: Plan upgrade this quarter
- Minor/patch behind: Update in next batch

### 3. Necessity Check
For each dependency, ask:
- Is this achievable in <20 lines of code? → Remove dependency
- Is there a smaller alternative? → Consider switching
- Is this only used in one file? → Evaluate if worth the install
- Does it have native/binary dependencies? → Extra scrutiny
- Is it actively maintained (commits in last 6 months)? → Flag if not

### 4. License Compliance
\`\`\`bash
npx license-checker --production --failOn "GPL-2.0;GPL-3.0;AGPL"
\`\`\`
- MIT, Apache-2.0, BSD: Safe for commercial use
- GPL, AGPL: Requires legal review
- Unlicensed: Do not use

### 5. Bundle Impact (Frontend)
\`\`\`bash
npx bundlephobia <package-name>
npx source-map-explorer dist/**/*.js
\`\`\`
- New dependency >50KB gzip: Requires justification
- Consider tree-shaking support
- Check if ESM build is available

## Output
1. **Vulnerability Report**: Critical/High items with remediation steps
2. **Update Plan**: Prioritized list of upgrades with breaking change notes
3. **Removal Candidates**: Dependencies that can be eliminated
4. **License Matrix**: All production dependencies with license types
5. **Bundle Report**: Size contribution per dependency (frontend only)
`;
}
