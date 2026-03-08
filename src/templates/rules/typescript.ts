export function typescriptRules(): string {
  return `## TypeScript
- Strict mode enabled — no \`any\` types
- Avoid \`as\` type assertions — use type guards or generics
- Use \`unknown\` instead of \`any\` for truly unknown types
- Prefer interfaces for object shapes, types for unions/intersections
- Use \`satisfies\` operator for type-safe object literals
- Use discriminated unions for state management
- Exhaustive switch statements with \`never\` default
- Proper error types: extend \`Error\`, don't throw strings`;
}
