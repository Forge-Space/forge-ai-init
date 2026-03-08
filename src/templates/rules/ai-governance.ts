export function aiGovernanceRules(): string {
  return `## AI Code Governance

- NEVER accept AI-generated code without understanding it — read, review, refactor
- Reject copy-paste patterns: if 3+ similar blocks exist, extract a shared abstraction
- AI output is a draft, not production code — always refactor before committing
- No "it works" as the only acceptance criteria — code must be maintainable, testable, and clear
- Enforce Single Responsibility: each function does ONE thing, each file owns ONE concern
- No god files: max 300 lines per file, max 50 lines per function
- No magic: all constants named, all conditions explained by function names, all flows traceable
- Require architectural intent: before generating code, define WHERE it goes and WHY
- Ban speculative features: don't generate "might need later" code — YAGNI strictly
- Every PR must reduce or maintain complexity — never increase cyclomatic complexity without justification
- AI-generated tests must test behavior, not implementation — mock boundaries only, not internals
- No AI-generated comments that restate the code — comments explain WHY, code explains WHAT
- Treat AI tools as junior developers: their output needs senior review, architecture guidance, and refactoring`;
}

export function aiAntiPatterns(): string {
  return `## AI Anti-Patterns to Block

- **Copy-paste proliferation**: Duplicate logic across files instead of shared utilities
- **Shallow error handling**: catch(e) { console.log(e) } — errors must be typed, logged, and handled
- **Missing input validation**: Trusting all inputs without sanitization at system boundaries
- **Over-engineering**: Abstract factories for single implementations — keep it simple
- **Dependency bloat**: Adding npm packages for things achievable in <20 lines
- **Dead code accumulation**: Commented-out code, unused imports, unreachable branches
- **Implicit coupling**: Components that break when unrelated files change
- **Missing error boundaries**: No fallback UI, no graceful degradation, no retry logic
- **Hardcoded values**: URLs, ports, timeouts, limits — externalize to config
- **No separation of concerns**: Business logic in UI components, data access in controllers`;
}
