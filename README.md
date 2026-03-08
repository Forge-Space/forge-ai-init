# forge-ai-init

**AI Governance Layer** — one command to add AI coding rules, skills, hooks, and quality gates to any project.

AI tools generate code fast, but without governance: no architecture patterns, no security rules, no quality gates, no technical conscience. `forge-ai-init` adds the missing layer.

## Quick Start

```bash
npx forge-ai-init
```

Interactive wizard detects your stack, asks your preferences, generates governance files. Done.

## The Problem

GitClear's analysis of 211M lines of code shows AI-assisted projects have **60% less refactored code**, **48% more copy-paste patterns**, and **2x code churn**. Ox Security found **10 recurring anti-patterns in 80-100% of AI-generated codebases**.

The result: **AI limbo engineering** — code that "works" but is unmaintainable, insecure, and unscalable.

`forge-ai-init` is the technical conscience your AI tools are missing.

## What It Generates

```
your-project/
├── CLAUDE.md                          # AI governance rules (Claude Code)
├── .cursorrules                       # Cursor governance rules
├── .windsurfrules                     # Windsurf governance rules
├── .github/copilot-instructions.md    # GitHub Copilot governance rules
├── .claude/
│   ├── settings.json                  # Permission model + hooks
│   └── skills/
│       ├── quality-gate/SKILL.md      # Pre-PR quality checks
│       ├── security-check/SKILL.md    # OWASP + dependency audit
│       ├── code-conscience/SKILL.md   # AI code discipline enforcer
│       ├── arch-review/SKILL.md       # Architecture enforcement
│       ├── test-first/SKILL.md        # TDD enforcement
│       ├── dependency-audit/SKILL.md  # Dependency health checks
│       ├── scalability-review/SKILL.md # Scalability assessment
│       ├── migration-audit/SKILL.md   # Legacy codebase assessment (--migrate)
│       └── tech-debt-review/SKILL.md  # Tech debt prioritization (--migrate)
├── MIGRATION.md                       # Migration roadmap (--migrate)
├── docs/adr/ADR-0001-*.md            # Initial migration ADR (--migrate)
├── .mcp.json                          # MCP server configs
├── .forge/                            # (enterprise tier)
│   ├── policies/                      # Security, quality, compliance policies
│   ├── scorecard.json                 # Scorecard configuration
│   └── features.json                  # Feature toggles seed
└── .github/workflows/                 # (or .gitlab-ci.yml)
    ├── ci.yml                         # Lint, build, test, audit
    ├── secret-scan.yml                # TruffleHog scanning
    ├── scorecard.yml                  # Project scorecard (enterprise)
    └── policy-check.yml               # Policy evaluation (enterprise)
```

## AI Governance Rules

Every generated rules file includes governance sections that prevent common AI-driven development anti-patterns:

- **AI Code Governance** — Reject copy-paste patterns, enforce refactoring, require architectural intent, ban speculative features
- **AI Anti-Patterns to Block** — 10 specific patterns: shallow error handling, dependency bloat, dead code, implicit coupling, missing validation
- **Scalability & Performance** — Database query patterns, API design, caching, async processing, observability (standard+)
- **Legacy Migration Governance** — Strangler fig pattern, characterization tests, incremental typing, feature flags (`--migrate`)

## Stack Detection

Auto-detects your project's language, framework, build tool, package manager, test framework, and CI provider.

| Category | Supported |
|----------|-----------|
| Languages | TypeScript, JavaScript, Python, Go, Rust, Java |
| Frameworks | Next.js, React, Vue, Svelte, Express, NestJS, FastAPI, Django, Flask, Spring, Astro, Remix, Nuxt, SvelteKit |
| Package Mgrs | npm, pnpm, yarn, bun, pip, poetry, cargo, go |
| CI/CD | GitHub Actions, GitLab CI, CircleCI, Jenkins |
| Test Frameworks | Jest, Vitest, pytest, Mocha, Playwright, Cypress |
| Build Tools | Vite, webpack, Turbopack, esbuild, tsup, Rollup, Parcel |

## Governance Tiers

| Tier | For | Skills | What's generated |
|------|-----|--------|------------------|
| **Lite** | Solo dev, prototypes | 0 | Rules + hooks |
| **Standard** | Teams, production | 3 | Rules + skills + MCP + CI |
| **Enterprise** | Organizations | 7 | Standard + policies + scorecard + feature toggles |

### Skills by Tier

| Skill | Lite | Standard | Enterprise |
|-------|------|----------|------------|
| quality-gate | - | ✓ | ✓ |
| security-check | - | ✓ | ✓ |
| code-conscience | - | ✓ | ✓ |
| arch-review | - | - | ✓ |
| test-first | - | - | ✓ |
| dependency-audit | - | - | ✓ |
| scalability-review | - | - | ✓ |
| migration-audit | - | `--migrate` | `--migrate` |
| tech-debt-review | - | `--migrate` | `--migrate` |

## CLI Usage

```bash
# Interactive (default)
npx forge-ai-init

# Non-interactive
npx forge-ai-init --tier standard --tools claude,cursor --yes

# Legacy migration mode
npx forge-ai-init --migrate --tier enterprise --yes

# Preview without writing
npx forge-ai-init --dry-run

# Overwrite existing files
npx forge-ai-init --force

# Target a specific directory
npx forge-ai-init --dir /path/to/project

# Update existing governance files (auto-detects tier/tools)
npx forge-ai-init update

# Update and upgrade to enterprise tier
npx forge-ai-init update --tier enterprise

# Assess migration readiness
npx forge-ai-init assess

# Assess with JSON output
npx forge-ai-init assess --json

# Watch mode — continuous scanning during development
npx forge-ai-init migrate --watch

# Scan only staged files (fast pre-commit check)
npx forge-ai-init migrate --staged
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dir <path>` | Target project directory | `.` |
| `--tier <level>` | Governance tier: `lite`, `standard`, `enterprise` | `standard` |
| `--tools <list>` | AI tools: `claude`, `cursor`, `windsurf`, `copilot` | `claude` |
| `--migrate` | Legacy migration mode (extra rules + skills) | `false` |
| `--force` | Overwrite existing files | `false` |
| `--dry-run` | Show what would be created | `false` |
| `--yes` | Skip interactive prompts | `false` |
| `--staged` | Scan only git-staged files (migrate command) | `false` |
| `--watch` | Watch for changes and re-scan (migrate command) | `false` |

## Update Governance Files

Run `update` to re-generate governance files with the latest rules and patterns:

```bash
npx forge-ai-init update
```

Auto-detects your current tier, tools, and migration mode from existing files. Only overwrites files whose content actually changed — unchanged files are preserved.

```bash
# Upgrade from lite to standard tier
npx forge-ai-init update --tier standard

# Add Cursor support to existing setup
npx forge-ai-init update --tools claude,cursor
```

## Governance Audit

Run `check` to audit any project's governance maturity — no generation needed:

```bash
npx forge-ai-init check
```

Scores 7 categories with 20+ weighted checks:

| Category | What it checks |
|----------|---------------|
| AI Rules | CLAUDE.md, AI governance rules, anti-patterns, multi-tool coverage |
| Skills | Governance skills count and coverage |
| Hooks & Safety | Claude settings, PreToolUse safety hooks, PostToolUse formatting |
| CI/CD | Pipeline presence, secret scanning, security scanning |
| Security | .env protection, SECURITY.md, MCP config |
| Code Quality | Linting, type checking, formatting, test framework |
| Policies | Enterprise policies, scorecard config |

Grades: **A** (90+) → **B** (75+) → **C** (60+) → **D** (40+) → **F** (<40)

Use the audit to assess legacy projects before migration:

```bash
# Audit a legacy project
npx forge-ai-init check --dir /path/to/legacy-app

# Then add governance
npx forge-ai-init --migrate --tier enterprise --dir /path/to/legacy-app
```

## Code Scanner

Run `migrate` to scan source code for anti-patterns, tech debt, and security issues:

```bash
npx forge-ai-init migrate
```

Detects 53 patterns across 10 categories (language-aware — rules only fire on matching file types):

| Category | What it finds |
|----------|--------------|
| Security | Hardcoded secrets, innerHTML assignment, SQL injection, code injection, unsafe HTML |
| Error Handling | Empty catch blocks, console-only error handling |
| Architecture | God files (>500 lines), function sprawl (>15 functions) |
| Engineering | @ts-ignore, sync I/O, index-as-key, console.log, TODO/FIXME, forEach+push |
| Async | Async Promise constructor, deep promise chains, setTimeout zero-delay |
| Type Safety | Explicit `any`, type assertions, non-null assertions |
| React | Fetch in useEffect, excessive useState (4+) |
| Scalability | Full lodash import |
| Accessibility | Images without alt text |
| Hardcoded Values | Hardcoded URLs that should be config |
| **Python** | Bare except, except-pass, os.system, subprocess shell, pickle, SQL format injection, typing.Any, type-ignore, import *, globals, mutable defaults, assert |
| **Go** | Bare error return, panic, empty interface, SQL concatenation, blank import, global mutex, goroutine leak |
| **Rust** | Unsafe blocks, unwrap/expect, excessive clone, todo! macro, allow(lint) suppression |
| **Svelte** | {@html} XSS risk, reactive event handlers, reactive fetch calls |

```bash
# Scan with colored terminal output
npx forge-ai-init migrate

# Machine-readable JSON output
npx forge-ai-init migrate --json

# Scan a specific directory
npx forge-ai-init migrate --dir /path/to/project

# Watch mode — re-scans on every file change
npx forge-ai-init migrate --watch

# Scan only git-staged files (fast pre-commit check)
npx forge-ai-init migrate --staged

# Staged scan with JSON output (for pre-commit hooks)
npx forge-ai-init migrate --staged --json
```

## Migration Assessment

Run `assess` to get a full health assessment of any codebase before migration:

```bash
npx forge-ai-init assess
```

Analyzes 5 categories with 35+ checks:

| Category | What it checks |
|----------|---------------|
| Dependencies | Legacy packages (jQuery, Moment, etc.), excessive deps, missing lockfile, no engine constraint |
| Architecture | God files (>500 lines), function sprawl (>20 per file), high coupling (>15 imports), flat structure |
| Security | Hardcoded secrets, AWS keys, private keys, eval/innerHTML/SQL injection, unrestricted CORS, missing .gitignore/.env |
| Quality | Test framework, linting, type checking, formatting, CI/CD, empty catch blocks, TODO accumulation, test coverage ratio |
| Migration Readiness | Legacy stack detection, global state pollution, TypeScript adoption, documentation, test safety net |

Health score (0-100) with A-F grading per category and overall. Migration readiness: **ready** / **needs-work** / **high-risk**.

Auto-detects migration strategy:
- **Strangler fig** — backends (Express, FastAPI, Django, Flask)
- **Branch by abstraction** — frontends (React, Vue, Next.js)
- **Parallel run** — Java applications

```bash
# Assess with colored terminal output
npx forge-ai-init assess

# Machine-readable JSON output
npx forge-ai-init assess --json

# Assess a specific directory
npx forge-ai-init assess --dir /path/to/legacy-app

# Full migration workflow
npx forge-ai-init assess --dir /path/to/legacy-app
npx forge-ai-init --migrate --tier enterprise --dir /path/to/legacy-app
```

## Configuration

Customize governance rules per-project with `.forgerc.json`:

```json
{
  "extends": "recommended",
  "rules": {
    "console-log": false,
    "empty-catch": { "severity": "critical" }
  },
  "categories": {
    "react": { "enabled": false }
  },
  "ignore": ["legacy/", "*.generated.*"],
  "thresholds": { "commit": 70, "pr": 80, "deploy": 90 },
  "maxFiles": 1000
}
```

### Presets

| Preset | Commit | PR | Deploy | Relaxed Rules |
|--------|--------|----|--------|---------------|
| `strict` | 80 | 85 | 90 | None |
| `recommended` | 60 | 70 | 80 | None |
| `lenient` | 40 | 50 | 60 | console-log, todo-marker, type-assertion disabled |

Config is auto-generated during scaffolding with a tier-appropriate preset. Supports `.forgerc.json`, `.forgerc`, and `forge.config.json`.

## Report Export

Export scan results for CI/CD pipelines and compliance workflows:

```bash
# Export as SARIF (GitHub Security tab)
npx forge-ai-init migrate --format sarif --output report.sarif

# Export as Markdown
npx forge-ai-init migrate --format markdown --output report.md

# Export as JSON
npx forge-ai-init migrate --format json --output report.json
```

SARIF reports integrate with GitHub's code scanning alerts — add to your CI workflow:

```yaml
- run: npx forge-ai-init migrate --format sarif --output results.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

## Legacy Migration Mode

Use `--migrate` to add governance to existing legacy projects. This mode adds:

- **Migration governance rules** — Strangler fig pattern, ADRs, incremental typing, backward-compatible APIs, feature flags for migration
- **migration-audit skill** — Full codebase health assessment: code quality, architecture, tests, security, scalability risks
- **tech-debt-review skill** — Categorized debt identification with impact/effort scoring matrix
- **dependency-audit skill** — Security vulnerabilities, outdated packages, license compliance, bundle impact
- **Progressive Quality Gates** — phased enforcement that increases thresholds as migration progresses:

| Phase | Threshold | Focus |
|-------|-----------|-------|
| Initial | 40% | Critical security, basic tests |
| Stabilization | 60% | Linting, type safety, test coverage |
| Production | 80% | Full governance enforcement |

- **Migration CI Workflow** — `migration-gate.yml` running governance audit + migration policy checks on every PR
- **Characterization test enforcement** — blocks migration without behavioral parity tests
- **ADR requirement** — warns on strategy changes without Architecture Decision Records

```bash
# Add governance to a legacy project
npx forge-ai-init --migrate --tier standard --yes

# Enterprise migration with full policy engine
npx forge-ai-init --migrate --tier enterprise --yes
```

## AI Tool Support

| Tool | Files Generated |
|------|----------------|
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`, `.mcp.json` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

## Enterprise Policy Engine

The enterprise tier generates a `.forge/` directory with policy files compatible with [`@forgespace/core`](https://www.npmjs.com/package/@forgespace/core):

- **Security policy** — secret exposure detection, authentication enforcement
- **Quality policy** — lint checks, test requirements, coverage thresholds
- **Compliance policy** — audit logging, correlation IDs
- **Framework policies** — a11y (React/Next.js), bundle size (Next.js), API validation (Express/NestJS/FastAPI)
- **Scorecard config** — framework-aware weights for automated project scoring
- **CI workflows** — `scorecard.yml` and `policy-check.yml` for PR-level enforcement

## License

MIT
