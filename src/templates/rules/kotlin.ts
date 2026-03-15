export function kotlinRules(): string {
  return `## Kotlin
- Use data classes for DTOs and value objects
- Prefer \`val\` over \`var\` — immutability by default
- Use sealed classes/interfaces for restricted hierarchies
- Use \`when\` expressions instead of if-else chains
- Prefer extension functions for utility behavior
- Use coroutines for async — no raw threads or callbacks
- Use \`require()\`/\`check()\` for preconditions and state invariants
- Null safety: avoid \`!!\` operator — use safe calls and Elvis operator
- Use \`sequence {}\` for lazy collection pipelines
- Run detekt for static analysis in CI`;
}
