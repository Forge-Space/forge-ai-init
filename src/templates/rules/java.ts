export function javaRules(): string {
  return `## Java
- Use records for DTOs and value objects (Java 16+)
- Prefer \`Optional<T>\` over null returns for missing values
- Use \`var\` for local variables with obvious types
- Sealed classes for domain hierarchies
- Use Stream API over manual loops for collection transforms
- Dependency injection via constructor — no field injection
- Always annotate overrides with \`@Override\`
- Prefer immutable collections (\`List.of()\`, \`Map.of()\`, \`Set.of()\`)
- Run SpotBugs or Error Prone in CI
- Use \`try-with-resources\` for all \`AutoCloseable\` objects`;
}
