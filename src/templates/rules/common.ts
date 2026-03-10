export function commonRules(): string {
  return `## Architecture
- Functions: <50 lines, cyclomatic complexity <10
- No god files — max 300 lines per module
- Separation of concerns: data access / business logic / presentation
- No circular dependencies between modules
- Dependencies flow inward: UI → Logic → Data

## Security
- Never expose credentials — use environment variables
- Validate ALL user input at system boundaries
- Sanitize output to prevent XSS
- Use parameterized queries — never concatenate SQL
- No secrets in source code — use .env files (gitignored)
- Run \`npm audit\` / \`pip audit\` before merging

## Code Quality
- No magic numbers — use named constants
- Handle errors explicitly — no empty catch blocks
- No copy-paste — extract shared logic into utilities
- Prefer composition over inheritance
- Name things clearly — code should read like prose
- Delete dead code, don't comment it out

## Testing
- Test business logic and user-facing behavior, not implementation details
- Coverage target: >80%
- Every bug fix includes a regression test
- Use realistic test data reflecting actual usage
- Edge cases and error conditions are first-class tests

## Workflow
- Conventional commits: feat, fix, refactor, chore, docs, test, ci
- Run lint + build + test before creating PRs
- Every PR needs a description with context and test plan
- Small, focused PRs — one concern per PR
- Review your own diff before requesting review

## Autonomous Skills
- Use governance skills proactively without slash commands
- Trigger \`test-autogen\` by default during implementation and commit flow
- Treat missing required tests as release blockers after warning phase`;
}
