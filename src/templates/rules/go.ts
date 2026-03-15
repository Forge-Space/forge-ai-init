export function goRules(): string {
  return `## Go
- Return \`error\` values — no panics in library code
- Prefer table-driven tests with \`t.Run()\` subtests
- \`context.Context\` as first parameter for I/O-bound functions
- No \`init()\` functions except for package registration
- Use \`errgroup\` for concurrent work with error propagation
- Prefer \`io.Reader\`/\`io.Writer\` interfaces for data streams
- Run \`go vet\` and \`staticcheck\` in CI
- Keep interfaces small (1–3 methods) — accept interfaces, return structs
- Use \`slog\` for structured logging
- No global mutable state — use dependency injection`;
}
