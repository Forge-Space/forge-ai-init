export function codeConscienceSkill(): string {
  return `---
name: code-conscience
description: Engineering discipline enforcer — prevents AI-generated code from degrading quality
---

# Code Conscience

## When to Use
- After every AI-assisted coding session
- Before committing AI-generated code
- During code review of AI-assisted PRs
- When code "works" but feels wrong

## The AI Code Quality Checklist

### 1. Understanding Check
- [ ] Can you explain what every line does without reading comments?
- [ ] Do you understand WHY this approach was chosen over alternatives?
- [ ] Could you rewrite this from memory if the code was deleted?
- If NO to any: refactor until you can say YES

### 2. Architecture Check
- [ ] Does this code live in the right file/module/layer?
- [ ] Does it follow existing patterns in the codebase?
- [ ] Are dependencies flowing in the right direction?
- [ ] Would a new developer understand the file structure?
- If NO to any: move, rename, or restructure before committing

### 3. Duplication Check
- [ ] Is any logic duplicated from another file?
- [ ] Are there 3+ similar code blocks that should be abstracted?
- [ ] Does this duplicate a utility that already exists?
- If YES to any: extract shared logic, use existing utilities

### 4. Simplicity Check
- [ ] Can any function be shortened without losing clarity?
- [ ] Are there abstractions that only have one implementation?
- [ ] Is there code generated "just in case" that has no current use?
- If YES to any: simplify, inline, or delete

### 5. Error Handling Check
- [ ] Are all error cases handled explicitly (not catch-all)?
- [ ] Do errors propagate with context (not swallowed)?
- [ ] Are external service failures handled with retries/fallbacks?
- [ ] Do users see helpful error messages (not stack traces)?
- If NO to any: add proper error handling before committing

### 6. Test Check
- [ ] Do tests verify behavior, not implementation?
- [ ] Are edge cases covered (null, empty, boundary, error)?
- [ ] Do tests use realistic data (not "test123", "foo", "bar")?
- [ ] Can tests run independently in any order?
- If NO to any: fix tests before committing

### 7. Security Check
- [ ] Is user input validated at system boundaries?
- [ ] Are credentials in environment variables, not code?
- [ ] Are SQL queries parameterized (no string concatenation)?
- [ ] Is output sanitized before rendering (XSS prevention)?
- If NO to any: fix security issues — these are blockers

## Verdict Scale
- **SHIP IT**: All checks pass, code is clean and maintainable
- **REFACTOR FIRST**: Code works but has quality issues — fix before merge
- **RETHINK**: Approach has fundamental problems — redesign needed
- **REJECT**: AI-generated code that adds more debt than value — delete and start fresh

## Key Principle
> "Working code is not the goal. Maintainable, secure, testable, understandable code is the goal. AI can produce the first kind quickly. Only engineering discipline produces the second."
`;
}
