# Changelog

## [Unreleased]

## [0.26.0] - 2026-03-15

### Added

- **5 new language rule templates**: Go, Rust, Java, Kotlin, Svelte with 8–10 idiomatic
  rules each — generated in CLAUDE.md/.cursorrules for detected stacks.
- **Kotlin language detection** via `build.gradle.kts` + `.kt` source files.
- **`src/shared.ts`** — consolidated shared utilities (walkFiles, scoreToGrade, readJson,
  CODE_EXTENSIONS, IGNORE_DIRS) eliminating ~160 lines of duplication across 6 files.
- **3 new test suites** for previously untested generators: skills (7 tests), mcp-config
  (7 tests), config-scaffold (6 tests). Test count: 25→28 suites, 484→504 tests.
- **`scripts/release.sh`** — automated release script handling version bump, CHANGELOG
  promotion, tagging, and GitHub release creation.
- Expanded MCP config: playwright now generated for SvelteKit/Nuxt/Astro;
  sequential-thinking added for Python projects.

### Changed

- Tenant context is now mandatory across commands:
  - `--tenant <id>` (or `FORGE_TENANT_ID`)
  - `--tenant-profile-ref <path>` (or `FORGE_TENANT_PROFILE_REF`)
- Added tenant profile loader/validator with fail-fast behavior when profile is missing,
  unreadable, malformed, or mismatched with `--tenant`.
- Generated hooks/settings/test-autogen commands now include tenant arguments by default.
- `quality-gate` now runs `forge-ai-action` with `command: diff` to enforce PR regressions
  instead of failing on historical repository-wide debt.
- CI `quality-gate` now checks out `forge-tenant-profiles`, validates tenant variables, and
  fails fast when `FORGE_TENANT_ID` / `FORGE_TENANT_PROFILE_REF` are missing or invalid.
- Version strings in `reporter.ts` and `index.ts` now read dynamically from `package.json`.

### Fixed

- Removed vulnerable regex parsing paths in `src/tenant-profile.ts` by replacing line parsing with
  deterministic string-based parsing helpers.
- Added regression coverage for YAML inline-comment profile parsing.

## [0.25.0] - 2026-03-10

### Added

- New `test-autogen` command for default test generation and enforcement:
  - `npx forge-ai-init test-autogen --staged --write --check`
  - `npx forge-ai-init test-autogen --check --json`
- New governance skill template: `.claude/skills/test-autogen/SKILL.md`
- New generated git hooks for non-agent execution:
  - `.githooks/pre-commit`
  - `.githooks/pre-push`
  - `scripts/hooks/install-hooks.sh`
- New weekly learning workflow:
  - `.github/workflows/test-autogen-learning.yml`
  - Generates metadata-only learning report and opens a manual-review PR
- Test-autogen telemetry and audit metadata:
  - `.forge/test-autogen-telemetry.jsonl`
  - `.forge/test-autogen-audit.jsonl`
  - `.forge/test-autogen-baseline.json`
- Checker now verifies `test-autogen` skill presence and `test-autogen` commit hook.

### Changed

- `generateSettings()` commit hook now runs test autogen before quality score gate.
- Standard tier skills: 3 → 4. Enterprise tier skills: 7 → 8.

### Fixed

- Hardened internal git command execution in `test-autogen` by removing shell command strings.
- Refined `test-autogen` tests to avoid insecure temporary path and command invocation patterns.

## [0.24.0] - 2026-03-09

### Changed

- **Rich markdown scan reports** — `--format markdown` now produces visually appealing PR comments with severity icons, collapsible sections, strengths/weaknesses analysis, category breakdown tables, hot files, and actionable recommendations. Clean projects show a strengths section; projects with findings get categorized tables with severity badges and improvement suggestions.

## [0.23.0] - 2026-03-08

### Fixed

- **`--format` flag now works without `--output`** — `migrate`, `assess`, and `gate` commands output clean markdown/JSON/SARIF to stdout when `--format` is specified, even without `--output <path>`. Previously, `--format` was silently ignored without `--output`, causing colored terminal output (ANSI escape codes) to appear in CI workflows that captured stdout for PR comments.

### Added

- `gate --format markdown` support — quality gate results as clean markdown for CI posting

## [0.22.0] - 2026-03-08

### Added

- **SecCodeBench CWE calibration** — 10 new rules bringing total to 119
  - Java: XXE, deserialization, SpEL injection, SSTI, XPath injection, Actuator exposure
  - Cross-language: open redirect, AES-ECB weak crypto
  - Go: dynamic code via JS engines
  - Java/Go: ZipSlip archive path traversal
- Scanner now covers 22 CWE types from Alibaba SecCodeBench benchmark

## [0.21.0] - 2026-03-08

### Added

- **10 SecCodeBench CWE calibration rules** (105→115 pattern rules, 119 total)
  - **Java** (+6): XXE/SAXParser/DocumentBuilder (CWE-611), ObjectInputStream
    deserialization (CWE-502), SpEL injection (CWE-917), SSTI via FreeMarker/
    Velocity/Ognl (CWE-1336), XPath injection (CWE-643), Spring Actuator
    exposure (CWE-200)
  - **Cross-language** (+2): open redirect (CWE-601), AES-ECB weak crypto
    (CWE-327)
  - **Go** (+1): dynamic code via goja/otto JS engines (CWE-94)
  - **Java/Go** (+1): ZipSlip archive path traversal (CWE-22)
- Scanner now covers 22 CWE types from Alibaba SecCodeBench benchmark
- Config file scanning: `.properties`, `.yml`, `.yaml` extensions added
- 12 new calibration tests including cross-language exclusion checks

## [0.20.0] - 2026-03-08

### Added

- **16 benchmark-derived scanner rules** (89→105 pattern rules, 109 total)
  - **Security** (+10): path traversal (CWE-22), SSRF (CWE-918), prototype
    pollution, insecure random, JWT decode without verify, dynamic code
    construction, error info leak, Python requests verify=False, Python
    tempfile.mktemp, Java Runtime.getRuntime
  - **Accessibility** (+2): button without label, input without label
  - **Error Handling** (+1): swallowed promise (empty catch)
  - **Scalability** (+1): Kotlin GlobalScope.launch
  - **Security (lang-specific)** (+2): Go math/rand, Python
    render_template_string (CWE-1336)
- 17 new tests for benchmark-derived rules including language isolation

## [0.19.0] - 2026-03-08

### Added

- **Scanner expansion** — 23 new rules across 4 languages (66→89 rules)
  - **Svelte** (+5): reactive assignment chains, bind:innerHTML, global DOM access, mutable prop defaults, spread props (closes #2)
  - **Go** (+5): format injection, init function overuse, os.Exit, reflect usage, unencrypted HTTP (closes #3)
  - **Rust** (+5): lock().unwrap(), transmute, Box::leak, panic! macro, raw pointers (closes #4)
  - **Python** (+8): eval/exec injection, unsafe YAML, weak hashes, star imports, print(), open without context manager, time.sleep (closes #7)
- **`ci` command** — One-command CI pipeline generation with quality gates
  - GitHub Actions, GitLab CI, Bitbucket Pipelines support
  - Auto-generates forge-quality workflow with scan + gate + optional baseline
  - Reads thresholds from `.forgerc.json`, supports `--phase`, `--threshold`, `--provider`
- **`diff` command** — PR-level quality delta analysis
  - Scans only changed files (staged or branch diff)
  - Compares against baseline for score delta
  - Reports new findings introduced by the PR
  - `--base`, `--staged`, `--json` flags
- 42 new tests (439 total across 22 suites)

### Changed

- Scanner from 66 to 89 regex rules across 10 categories, 7 languages
- Total commands: 13 (init, check, migrate, assess, update, baseline, plan, doctor, gate, scaffold, migrate-plan, ci, diff)

## [0.18.0] - 2026-03-08

### Added

- **`plan` command** — Architecture-first project planning & risk analysis
  - Structure analysis (file counts, test ratio, entry points)
  - Risk detection (missing CI, type-safety, low tests, security, architecture)
  - Prioritized recommendations (must/should/could)
  - ADR suggestions based on stack and monorepo status
  - Framework-specific scaling strategies (Edge for Next.js, horizontal for Express, ASGI for FastAPI)
  - 3-phase quality gates (40% foundation → 60% stabilization → 80% production)
- **`doctor` command** — Continuous architecture health monitoring
  - 11 health checks across 5 categories (architecture, security, governance, quality, testing)
  - Trend detection via baseline integration (improving/stable/degrading)
  - Coupling and complexity scores
  - CLAUDE.md and ARCHITECTURE.md presence checks
- **`gate` command** — CI/CD quality gate enforcement
  - Exit code 0 (pass) / 1 (fail) for CI integration
  - Auto-detects phase from score (foundation/stabilization/production)
  - Phase-aware severity blocking (critical always, +high in production)
  - Reads thresholds from `.forgerc.json` config
  - `--phase` and `--threshold` overrides
- **`scaffold` command** — Golden path project templates
  - 5 templates: nextjs-app, express-api, fastapi-service, ts-library, cli-tool
  - All templates include `.gitignore`, `CLAUDE.md`, `.forgerc.json` from day one
  - Template listing with `scaffold` (no flags)
  - `--json` output for all 4 new commands
- **`migrate-plan` command** — Detailed migration roadmap with actionable phases
  - Strategy detection (Strangler Fig, Branch by Abstraction, Parallel Run, Incremental)
  - Strangler boundary analysis — identifies god files and function sprawl as decomposition targets
  - Dependency risk analysis — detects 11 legacy packages (moment, jquery, request, etc.) with alternatives
  - Incremental typing plan — prioritized JS→TS file conversion ordering (entry points, utils first)
  - Phased migration plan (Stabilize → Modernize → Harden) with quality gates per phase
  - Estimated effort calculation based on boundary complexity, typing needs, and dependency risks
- 79 new tests across 5 suites (397 total across 20 suites)

## [0.17.0] - 2026-03-08

### Added

- **Java scanner rules** — 8 Java-specific anti-pattern detections (closes #13)
  - System.out.println (use logging framework), raw JDBC Statement (SQL injection), @SuppressWarnings
  - Thread.sleep (use async), hardcoded credentials, legacy Date/SimpleDateFormat, empty catch, printStackTrace
- **Kotlin scanner rules** — 5 Kotlin-specific anti-pattern detections (closes #13)
  - `!!` non-null assertion, runBlocking in production, empty catch, @Suppress, TODO markers
- **Java/Kotlin function counting** for architecture sprawl detection
- `.kt`/`.kts` added to scanned file extensions
- 16 new Java/Kotlin scanner tests (318 total across 15 suites)

### Changed

- Scanner from 53 to 66 regex rules across 10 categories

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
