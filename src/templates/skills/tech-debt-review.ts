export function techDebtReviewSkill(): string {
  return `---
name: tech-debt-review
description: Identify, categorize, and prioritize technical debt for systematic reduction
---

# Tech Debt Review

## When to Use
- Sprint planning: identify debt items to include
- Before new features: check if existing debt will compound
- Monthly/quarterly tech debt review meetings
- After major incidents caused by tech debt

## Debt Categories

### 1. Code Debt
- Duplicated logic (>3 similar blocks → needs abstraction)
- Functions exceeding 50 lines or complexity >10
- Files exceeding 300 lines
- Magic numbers and hardcoded strings
- Missing type safety (any types, untyped parameters)
- Dead code (unused exports, commented blocks, unreachable branches)

### 2. Architecture Debt
- Circular dependencies between modules
- Business logic in wrong layer (UI, controllers, utilities)
- Missing abstraction boundaries (direct DB access from routes)
- Monolithic files that should be split by concern
- Inconsistent patterns across similar features

### 3. Test Debt
- Critical paths without test coverage
- Brittle tests that break on implementation changes
- Missing integration tests for external service boundaries
- Tests with hardcoded data that doesn't reflect production
- Skipped or disabled tests (.skip, @pytest.mark.skip)

### 4. Dependency Debt
- Packages >2 major versions behind
- Dependencies with known vulnerabilities
- Abandoned packages (no updates in >1 year)
- Packages replaceable with stdlib or small utility functions
- Lock file conflicts from inconsistent installs

### 5. Infrastructure Debt
- Missing CI/CD stages (no lint, no type check, no security audit)
- Manual deployment steps
- Inconsistent environments (dev vs prod drift)
- Missing monitoring, alerting, or structured logging
- Hardcoded configuration that should be environment-driven

## Scoring Matrix

| Impact | Description | Points |
|--------|-------------|--------|
| 5 - Critical | Causes outages, data loss, or security breaches | 25 |
| 4 - High | Blocks features, slows development significantly | 16 |
| 3 - Medium | Increases bug risk, makes changes harder | 9 |
| 2 - Low | Code smell, minor friction | 4 |
| 1 - Cosmetic | Style issues, naming conventions | 1 |

Score = Impact^2 / Effort (higher = fix first)

## Process
1. Scan codebase with linters and analyzers
2. Categorize findings into 5 debt types
3. Score each item (impact x effort)
4. Rank by score descending
5. Group into: Fix Now (score >15), Plan (5-15), Backlog (<5)
6. Output actionable tickets with file paths and suggested fixes
`;
}
