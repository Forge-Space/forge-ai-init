export function pythonRules(): string {
  return `## Python
- Type hints on all function signatures
- Use dataclasses or Pydantic models for structured data
- Virtual environments required — never install globally
- \`ruff\` for linting and formatting
- \`pytest\` for testing with fixtures and parametrize
- No bare \`except:\` — always catch specific exceptions
- Use pathlib.Path, not os.path for file operations
- Async: use \`asyncio\` consistently, don't mix sync/async
- f-strings for formatting, not \`.format()\` or \`%\`
- Imports: stdlib → third-party → local (isort handles this)`;
}
