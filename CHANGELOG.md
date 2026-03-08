# Changelog

## [Unreleased]

## [0.16.0] - 2026-03-08

### Added

- **`baseline` command** — track quality score over time (closes #14)
  - `forge-ai-init baseline` saves scan snapshot to `.forge/baseline.json`
  - `forge-ai-init baseline --compare` shows score delta, per-category changes, new/resolved findings
  - History array for trend tracking across multiple snapshots
- **CI/CD integration guide** in README — GitHub Actions (quality gate, SARIF upload, staged scan, full pipeline), GitLab CI, pre-commit hooks, configurable thresholds, badge generation
- 12 new baseline tests (302 total across 15 suites)

## [0.15.0] - 2026-03-08

### Added

- **Watch mode** (`--watch`) — continuous file monitoring with debounced re-scans
  - Watches for code file changes in project directory (recursive)
  - 300ms debounce to batch rapid saves
  - Compact single-line output per scan with grade, score, and finding count
  - Shows top 3 findings per scan cycle
- **Staged-only scanning** (`--staged`) — scan only git-staged files
  - Uses `git diff --cached --name-only` to get staged file list
  - Fast pre-commit scanning — only checks files about to be committed
  - Works with `--json`, `--output`, and `--format` flags
- `scanSpecificFiles()` export — scan an explicit file list (used by --staged)
- Internal refactor: extracted `buildReport()` from `scanProject()` for reuse

## [0.14.0] - 2026-03-08

### Added

- **Go scanner rules** — 7 Go-specific anti-pattern detections (closes #3)
  - bare error return without wrapping, panic(), empty interface{}, SQL concatenation in Exec
  - blank import for side effects, global sync.Mutex, anonymous goroutine leak risk
- **Rust scanner rules** — 6 Rust-specific anti-pattern detections (closes #4)
  - unsafe block, .unwrap() panic, .expect() panic, .clone() copies, todo!/unimplemented! macros, lint suppression
- **Svelte scanner rules** — 3 Svelte-specific detections (closes #2)
  - {@html} XSS risk, reactive event handler, reactive fetch (use onMount)
- **Go/Rust function counting** for architecture sprawl detection
- 13 new Go/Rust/Svelte tests (285 total across 14 suites)

### Changed

- Scanner from 37 to 53 regex rules across 10 categories
- Function sprawl detection now supports Go `func` and Rust `fn`/`pub fn`

## [0.13.0] - 2026-03-08

### Added

- **Python scanner rules** — 12 Python-specific anti-pattern detections (closes #7)
  - **error-handling** (2): bare `except:` (catches SystemExit), `except Exception: pass` (silent swallow)
  - **security** (4): `os.system()` (shell injection), `subprocess shell=True`, `pickle` deserialization, SQL `.format()` injection
  - **type-safety** (2): `typing.Any` import, `# type: ignore` suppression
  - **engineering** (3): wildcard `import *`, mutable default arguments (`def f(x=[])`), `assert` in production
  - **architecture** (1): `global` variable mutation
- **Language-aware rule filtering** — rules with `extensions` field only fire on matching file types
  - React rules (useEffect, useState, JSX patterns) only on `.tsx`/`.jsx`
  - TypeScript rules (any, type assertion, non-null) only on `.ts`/`.tsx`
  - Python rules only on `.py`
  - Universal rules (secrets, URLs, TODO, SQL injection) fire on all files
- **Python function counting** — `checkFileSize` now counts `def`/`async def` for Python file sprawl detection
- 13 new Python scanner tests (272 total across 14 suites)

### Changed

- Scanner rules now have optional `extensions` field for language-scoped matching
- Scanner from 25 to 37 rules across 10 categories

## [0.12.0] - 2026-03-08

### Added

- **Restore `assess` command** — full migration health assessment with 5 collectors (dependencies, architecture, security, quality, migration readiness)
- **`--output` and `--format` flags for `assess` command** — export assessment as JSON or Markdown to file (closes #6)
- **Semgrep CE and Trivy security scanning** CI workflows using reusable workflows from Forge-Space/.github

### Fixed

- `assess` command handler was accidentally removed during dead code cleanup in v0.9.0

## [0.11.0] - 2026-03-08

### Added

- **Config-based rule customization** (`.forgerc.json`) — project-level governance configuration
  - 3 presets: `strict` (80/85/90 thresholds), `recommended` (60/70/80), `lenient` (40/50/60 + relaxed rules)
  - Per-rule overrides: disable rules (`false`) or change severity (`{ severity: 'low' }`)
  - Category toggles: enable/disable entire finding categories
  - File ignore patterns: prefix and wildcard matching
  - `maxFiles` override for large codebases
  - Supports 3 config filenames: `.forgerc.json`, `.forgerc`, `forge.config.json`
- **Report export** — multi-format scan output for CI/CD integration
  - JSON format: machine-readable full report
  - Markdown format: human-readable tables with category summary, top files, critical findings
  - SARIF format: GitHub Security tab compatible (SARIF 2.1.0)
  - `--output <path>` flag to write report to file
  - `--format <json|markdown|sarif>` flag to select output format
- **Config scaffold** — `generate` now creates `.forgerc.json` with tier-appropriate preset
  - Enterprise → `strict`, Standard → `recommended`, Lite → `lenient`
  - Includes default ignore patterns and maxFiles
- 28 config tests + 20 reporter tests (260 total across 14 suites)

### Changed

- Scanner now loads `.forgerc.json` and respects all config overrides (disabled rules, severity changes, category toggles, file ignoring)
- CLI `migrate` command now supports `--output` and `--format` flags

## [0.10.0] - 2026-03-08

### Added

- **`assess` command** — full legacy migration health assessment with 5 specialized collectors
  - **Dependencies**: legacy packages (jQuery, Moment, etc.), excessive deps, missing lockfile, no engine constraint
  - **Architecture**: god files (>500 lines), function sprawl (>20 per file), high coupling (>15 imports), flat structure
  - **Security**: hardcoded secrets, AWS keys, private keys, eval/innerHTML/SQL injection, unrestricted CORS, missing .gitignore/.env
  - **Quality**: test framework, linting, type checking, formatting, CI/CD, empty catch blocks, TODO accumulation, test coverage ratio
  - **Migration Readiness**: legacy stack detection, global state pollution, TypeScript adoption, documentation, test safety net
- Health score (0-100) with A-F grading per category and overall
- Migration readiness classification: ready / needs-work / high-risk
- Auto-detected migration strategy: strangler-fig (backends), branch-by-abstraction (frontends), parallel-run (Java)
- JSON output mode (`--json`) for CI integration
- 35 new assessor tests (195 total across 10 suites)
- **`update` command** — smart re-generation of governance files
  - Auto-detects existing tier (lite/standard/enterprise) from file structure
  - Auto-detects existing AI tools from governance files present
  - Auto-detects migration mode from CLAUDE.md content
  - Only overwrites files whose content actually changed (unchanged files preserved)
  - Supports `--tier` and `--tools` overrides for upgrading
  - Reports updated/added/unchanged files
- 8 new updater tests (203 total across 11 suites)
- **Pre-commit quality gate hooks** — blocks commits below quality threshold
  - Standard tier: score must be ≥60 to commit
  - Enterprise tier: score must be ≥75 to commit
  - Runs scanner automatically on `git commit` within Claude Code sessions
- 9 new settings generator tests (212 total across 12 suites)

## [0.9.0] - 2026-03-08

### Added

- **Scanner expansion: 25 rules across 10 categories** — up from 10 rules across 5 categories
  - **async** (3 rules): async Promise constructor, deep promise chains (3+ `.then`), `setTimeout(fn, 0)`
  - **react** (2 rules): fetch in useEffect without cleanup, excessive useState (4+)
  - **type-safety** (3 rules): explicit `any` type, type assertions (`as`), non-null assertions (`!.`)
  - **security** (2 new): `innerHTML` assignment (XSS), SQL string concatenation (injection)
  - **engineering** (3 new): `console.log`/`debug`/`info`, TODO/FIXME/HACK/XXX markers, `forEach` + `push` pattern
  - **scalability** (1 new): full lodash import (use `lodash/specific` for tree-shaking)
  - **accessibility** (1 new): `<img>` without `alt` attribute
- 15 new scanner tests (167 total across 9 suites)

### Fixed

- Removed dead `assess` command and orphaned assessor module references
- Fixed promise chain regex to match arrow functions with nested parentheses

## [0.8.0] - 2026-03-08

### Added

- **Migration Roadmap Generator** — generates `MIGRATION.md` with phased migration plan when using `--migrate`
  - Auto-detects migration strategy: strangler fig (backends), branch by abstraction (frontends), parallel run (Java)
  - 4 migration phases with tasks: Assessment → Foundation (40%) → Stabilization (60%) → Production (80%)
  - Includes ADR template and key CLI commands
- **Initial ADR** — generates `docs/adr/ADR-0001-migration-strategy.md` with strategy rationale
  - Stack-aware rationale explaining why the chosen strategy fits the detected framework
  - Progressive quality gate references (40% → 60% → 80%)
- 10 new migration generator tests (152 total across 9 suites)

## [0.7.0] - 2026-03-08

### Added

- **`scan` command** (`forge-ai-init migrate`) — Static analysis scanner that detects AI anti-patterns in source code
  - 10 rules: empty catch, console-only catch, hardcoded secrets, hardcoded URLs, ts-ignore, sync I/O, index-as-key, unsafe HTML injection, code injection, CSS !important
  - Architecture checks: god files (>500 lines), large files (>300 lines), function sprawl (>10/15 functions)
  - Walks source files (12 extensions: .ts, .tsx, .js, .jsx, .mjs, .cjs, .py, .go, .rs, .java, .vue, .svelte)
  - Skips build dirs (node_modules, dist, .next, **pycache**, etc.)
  - Severity-weighted scoring (critical=10, high=5, medium=2, low=1)
  - Category summary, top files ranking, colored terminal output
  - `--json` flag for machine-readable output
  - Max 500 files per scan (configurable)
- 12 new scanner tests (142 total across 8 suites)

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
