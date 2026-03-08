# Changelog

## [0.6.0] - 2026-03-08

### Added

- **Progressive Quality Gate Policies** — phased migration enforcement with escalating thresholds
  - Phase 1 (Initial): 40% quality threshold — critical security and basic tests
  - Phase 2 (Stabilization): 60% threshold — linting, type safety, test coverage
  - Phase 3 (Production): 80% threshold — full governance enforcement
  - Characterization tests required before module migration
  - ADR required for migration strategy changes
  - Dependency modernization check for EOL packages
- **Migration Scorecard Config** — phase-aware scorecard with per-phase focus areas and reduced initial threshold
- **Migration Quality Gate CI Workflow** — `migration-gate.yml` GitHub Actions workflow running governance audit + migration policy checks on PRs
- 10 new tests (130 total across 7 suites)
  - 6 migration policy tests: progressive rules, phased thresholds, tier combinations
  - 4 migration workflow tests: gate generation, enterprise + migrate, skip when not migrating

### Changed

- `generateWorkflows()` now passes `migrate` option through to workflow generation
- Enterprise + migrate mode uses migration scorecard config (lower initial threshold)
- Lite + migrate generates migration policy and scorecard (no enterprise policies)

## [0.5.0] - 2026-03-08

### Added

- **`check` command** — Governance audit that scores any project's engineering maturity (A-F grade, 0-100 score)
  - 7 audit categories: AI Rules, Skills, Hooks & Safety, CI/CD, Security, Code Quality, Policies
  - 20+ weighted checks across categories
  - Weighted scoring: critical checks (CI, type checking, CLAUDE.md) worth 3x, nice-to-haves worth 1x
  - Color-coded terminal output with pass/fail/warn indicators
  - Actionable recommendations with exact fix commands
  - Works on ANY project — not just forge-ai-init generated ones
- 14 new checker tests (120 total across 7 suites)

### Example

```bash
$ npx forge-ai-init check

  AI Rules ──────────── 4/4  ✓
  Skills ────────────── 2/2  ✓
  Hooks & Safety ────── 3/3  ✓
  CI/CD ─────────────── 3/3  ✓
  Security ──────────── 3/3  ✓
  Code Quality ──────── 4/4  ✓
  Policies ──────────── 3/3  ✓

  Grade: A  Score: 100/100
```

## [0.4.0] - 2026-03-08

### Added

- **AI Code Governance rules**: Anti-patterns detection, copy-paste prevention, refactoring enforcement — included in ALL tiers and ALL tool outputs
- **AI Anti-Patterns to Block**: 10 specific patterns AI tools generate that degrade codebases (shallow error handling, dependency bloat, dead code, implicit coupling)
- **Scalability & Performance rules**: Database query patterns, API design, caching strategy, async processing, observability (standard+ tiers)
- **Legacy Migration mode** (`--migrate`): Extra rules + skills for modernizing existing codebases
  - Migration governance rules (strangler fig, characterization tests, ADRs, feature flags)
  - `migration-audit` skill: Comprehensive legacy codebase health assessment
  - `tech-debt-review` skill: Categorized debt identification with scoring matrix
  - `dependency-audit` skill: Security, freshness, necessity, license, and bundle impact checks
- **Code Conscience skill**: Engineering discipline enforcer — 7-point quality checklist for AI-generated code (standard+ tiers)
- **Scalability Review skill**: Database, API, caching, async, and observability assessment (enterprise tier)
- Interactive wizard now asks about legacy migration mode
- CLI `--migrate` flag for non-interactive migration mode
- 22 new tests (106 total across 6 suites)

### Changed

- All generated rule files now include AI governance sections by default
- Standard tier skills: 2 → 3 (added code-conscience)
- Enterprise tier skills: 4 → 7 (added code-conscience, dependency-audit, scalability-review)
- Migration mode adds up to 3 additional skills (migration-audit, tech-debt-review, dependency-audit)

## [0.3.0] - 2026-03-08

### Added

- Enterprise policy engine: security, quality, compliance policies (.forge/policies/)
- Framework-specific policies: a11y (React/Next.js), bundle size (Next.js), API validation (Express/NestJS/FastAPI)
- Scorecard configuration with framework-aware weights (.forge/scorecard.json)
- Feature toggles seed file (.forge/features.json)
- Scorecard and policy-check CI workflows for enterprise tier
- Compatible with @forgespace/core forge-scorecard and forge-policy CLIs
- 11 new tests (84 total across 5 suites)

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
