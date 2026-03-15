export function rustRules(): string {
  return `## Rust
- Prefer \`Result<T, E>\` over \`unwrap()\`/\`expect()\` in library code
- Run \`clippy\` with \`-D warnings\` in CI
- Prefer borrowing over cloning — minimize allocations
- Use \`thiserror\` for library errors, \`anyhow\` for applications
- Implement \`Display\` and \`Debug\` for custom types
- Use \`#[must_use]\` on functions returning meaningful values
- Prefer iterators over manual loops for collection transforms
- Run \`cargo fmt\` before commit — enforce in CI
- Use \`#[cfg(test)]\` modules for unit tests
- No \`unsafe\` without a \`// SAFETY:\` comment justifying correctness`;
}
