export function migrationAuditSkill(): string {
  return `---
name: migration-audit
description: Comprehensive legacy codebase health assessment for migration planning
---

# Migration Audit

## When to Use
- Before starting a migration or modernization effort
- When inheriting a legacy codebase
- When planning a major refactoring initiative
- Quarterly health checks on aging codebases

## Assessment Areas

### 1. Codebase Health
- **File size distribution**: Identify god files (>300 lines)
- **Function complexity**: Find functions with cyclomatic complexity >10
- **Dependency age**: List outdated packages with security implications
- **Dead code**: Unreachable branches, unused exports, commented-out blocks
- **Copy-paste debt**: Duplicate code blocks that should be abstracted

### 2. Architecture Assessment
- **Coupling analysis**: Which modules are tightly coupled?
- **Dependency direction**: Does data flow inward (clean) or outward (messy)?
- **Circular dependencies**: Modules that import each other
- **API surface**: Public interfaces that consumers depend on
- **Database coupling**: ORM leaking into business logic

### 3. Test Coverage Gaps
- **Critical paths**: Are the most important user flows tested?
- **Error handling**: Are failure modes covered?
- **Integration points**: External services, database queries, APIs
- **Edge cases**: Null handling, empty states, boundary values

### 4. Security Posture
- **Dependency vulnerabilities**: npm audit / pip audit results
- **Secret exposure**: Hardcoded credentials, API keys in code
- **Input validation**: Unsanitized user input reaching database/filesystem
- **Authentication gaps**: Missing auth on protected routes

### 5. Scalability Risks
- **N+1 queries**: Database access patterns in loops
- **Missing pagination**: List endpoints returning unbounded results
- **In-memory state**: Session data, caches that prevent horizontal scaling
- **Synchronous bottlenecks**: Long operations blocking request handlers

## Output Format

Produce a markdown report with:
1. **Executive Summary**: Overall health score (A-F) with top 3 risks
2. **Priority Matrix**: Issues scored by impact (1-5) x effort (1-5)
3. **Migration Roadmap**: Recommended order of modernization phases
4. **Quick Wins**: Issues fixable in <1 hour with high impact
5. **Technical Debt Inventory**: Cataloged items with estimated effort

## Process
1. Run static analysis tools (ESLint, tsc, ruff, sonarqube if available)
2. Check dependency age and vulnerabilities
3. Analyze file structure and module boundaries
4. Review test coverage reports
5. Check for common anti-patterns
6. Generate prioritized report
`;
}
