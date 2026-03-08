export function archReviewSkill(): string {
  return `---
name: arch-review
description: Validate code against architecture patterns and conventions
---

# Architecture Review

Validate that code follows established architecture patterns.

## When to Use

- After adding new files or modules
- When refactoring code structure
- Before PRs that change file organization

## Checks

1. **File organization**: Files are in the correct directories
2. **Dependency direction**: Dependencies flow inward (UI → Logic → Data)
3. **Circular imports**: No circular dependencies between modules
4. **Module boundaries**: API surfaces are explicit (barrel exports)
5. **File size**: No file exceeds 300 lines
6. **Function complexity**: Cyclomatic complexity < 10

## Process

1. Identify changed/new files from git diff
2. Check each file against the rules above
3. Report violations with specific file:line references
4. Suggest fixes for each violation

## What to Flag

- Files in wrong directories (e.g., business logic in UI layer)
- Direct database access from UI components
- Utility functions that should be shared modules
- God objects with too many responsibilities
`;
}
