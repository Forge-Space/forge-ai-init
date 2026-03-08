# Changelog

## [0.2.0] - 2026-03-08

### Added

- Interactive mode with @clack/prompts: tier selection, tool multiselect, confirmation
- Default `npx forge-ai-init` now launches interactive wizard
- GitHub Actions CI workflow: lint, typecheck, build, test, security audit
- Publish workflow: auto-publish to npm on GitHub release

### Changed

- Non-interactive mode triggers with --yes, --tier, or --tools flags

## [0.1.0] - 2026-03-08

### Added

- Stack detection engine: auto-detects language, framework, build tool, package manager, test framework, CI provider, and monorepo structure
- CLAUDE.md generator with stack-aware rule templates for TypeScript, Next.js, React, Vue, Express, Python, Node.js
- .cursorrules, .windsurfrules, and copilot-instructions.md generators
- Skills generator: quality-gate, security-check, arch-review, test-first
- Settings/hooks generator: safety guardrails, auto-formatting, git workflow protection, secret file protection
- MCP config generator with context7 and playwright support
- CI workflow generator for GitHub Actions AND GitLab CI
- Three governance tiers: lite (rules + hooks), standard (+ skills + MCP + CI), enterprise (+ compliance)
- Support for 6 languages, 14 frameworks, 7 package managers, 4 CI providers
- Non-interactive mode with --tier, --tools, --force, --dry-run, --yes flags
- 73 tests across 4 suites
