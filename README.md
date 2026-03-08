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

| Category        | Supported                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Languages       | TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin                                                      |
| Frameworks      | Next.js, React, Vue, Svelte, Express, NestJS, FastAPI, Django, Flask, Spring, Astro, Remix, Nuxt, SvelteKit |
| Package Mgrs    | npm, pnpm, yarn, bun, pip, poetry, cargo, go                                                                |
| CI/CD           | GitHub Actions, GitLab CI, CircleCI, Jenkins                                                                |
| Test Frameworks | Jest, Vitest, pytest, Mocha, Playwright, Cypress                                                            |
| Build Tools     | Vite, webpack, Turbopack, esbuild, tsup, Rollup, Parcel                                                     |

## Governance Tiers

| Tier           | For                  | Skills | What's generated                                  |
| -------------- | -------------------- | ------ | ------------------------------------------------- |
| **Lite**       | Solo dev, prototypes | 0      | Rules + hooks                                     |
| **Standard**   | Teams, production    | 3      | Rules + skills + MCP + CI                         |
| **Enterprise** | Organizations        | 7      | Standard + policies + scorecard + feature toggles |

### Skills by Tier

| Skill              | Lite | Standard    | Enterprise  |
| ------------------ | ---- | ----------- | ----------- |
| quality-gate       | -    | ✓           | ✓           |
| security-check     | -    | ✓           | ✓           |
| code-conscience    | -    | ✓           | ✓           |
| arch-review        | -    | -           | ✓           |
| test-first         | -    | -           | ✓           |
| dependency-audit   | -    | -           | ✓           |
| scalability-review | -    | -           | ✓           |
| migration-audit    | -    | `--migrate` | `--migrate` |
| tech-debt-review   | -    | `--migrate` | `--migrate` |

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

# Save a quality baseline snapshot
npx forge-ai-init baseline

# Compare current scan against saved baseline
npx forge-ai-init baseline --compare

# Architecture planning with risk analysis
npx forge-ai-init plan

# Continuous health monitoring
npx forge-ai-init doctor

# CI quality gate enforcement (exit code 0/1)
npx forge-ai-init gate --phase production --threshold 80

# Create project from golden path template
npx forge-ai-init scaffold --template nextjs-app --name my-app
```

### Options

| Flag             | Description                                         | Default    |
| ---------------- | --------------------------------------------------- | ---------- |
| `--dir <path>`   | Target project directory                            | `.`        |
| `--tier <level>` | Governance tier: `lite`, `standard`, `enterprise`   | `standard` |
| `--tools <list>` | AI tools: `claude`, `cursor`, `windsurf`, `copilot` | `claude`   |
| `--migrate`      | Legacy migration mode (extra rules + skills)        | `false`    |
| `--force`        | Overwrite existing files                            | `false`    |
| `--dry-run`      | Show what would be created                          | `false`    |
| `--yes`          | Skip interactive prompts                            | `false`    |
| `--staged`       | Scan only git-staged files (migrate command)        | `false`    |
| `--watch`        | Watch for changes and re-scan (migrate command)     | `false`    |
| `--compare`      | Compare against saved baseline (baseline command)   | `false`    |
| `--phase <p>`    | Quality gate phase: foundation, stabilization, production | auto     |
| `--threshold <n>`| Quality gate minimum score (0-100)                  | from config|
| `--template <id>`| Scaffold template ID                                | -          |
| `--name <name>`  | Project name (scaffold command)                     | -          |

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

| Category       | What it checks                                                     |
| -------------- | ------------------------------------------------------------------ |
| AI Rules       | CLAUDE.md, AI governance rules, anti-patterns, multi-tool coverage |
| Skills         | Governance skills count and coverage                               |
| Hooks & Safety | Claude settings, PreToolUse safety hooks, PostToolUse formatting   |
| CI/CD          | Pipeline presence, secret scanning, security scanning              |
| Security       | .env protection, SECURITY.md, MCP config                           |
| Code Quality   | Linting, type checking, formatting, test framework                 |
| Policies       | Enterprise policies, scorecard config                              |

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

Detects 66 patterns across 10 categories (language-aware — rules only fire on matching file types):

| Category         | What it finds                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security         | Hardcoded secrets, innerHTML assignment, SQL injection, code injection, unsafe HTML                                                                        |
| Error Handling   | Empty catch blocks, console-only error handling                                                                                                            |
| Architecture     | God files (>500 lines), function sprawl (>15 functions)                                                                                                    |
| Engineering      | @ts-ignore, sync I/O, index-as-key, console.log, TODO/FIXME, forEach+push                                                                                  |
| Async            | Async Promise constructor, deep promise chains, setTimeout zero-delay                                                                                      |
| Type Safety      | Explicit `any`, type assertions, non-null assertions                                                                                                       |
| React            | Fetch in useEffect, excessive useState (4+)                                                                                                                |
| Scalability      | Full lodash import                                                                                                                                         |
| Accessibility    | Images without alt text                                                                                                                                    |
| Hardcoded Values | Hardcoded URLs that should be config                                                                                                                       |
| **Python**       | Bare except, except-pass, os.system, subprocess shell, pickle, SQL format injection, typing.Any, type-ignore, import \*, globals, mutable defaults, assert |
| **Go**           | Bare error return, panic, empty interface, SQL concatenation, blank import, global mutex, goroutine leak                                                   |
| **Rust**         | Unsafe blocks, unwrap/expect, excessive clone, todo! macro, allow(lint) suppression                                                                        |
| **Java**         | System.out.println, raw JDBC Statement, @SuppressWarnings, Thread.sleep, hardcoded credentials, legacy Date, empty catch, printStackTrace                  |
| **Kotlin**       | `!!` non-null assertion, runBlocking, empty catch, @Suppress, TODO markers                                                                                 |
| **Svelte**       | {@html} XSS risk, reactive event handlers, reactive fetch calls                                                                                            |

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

| Category            | What it checks                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Dependencies        | Legacy packages (jQuery, Moment, etc.), excessive deps, missing lockfile, no engine constraint                        |
| Architecture        | God files (>500 lines), function sprawl (>20 per file), high coupling (>15 imports), flat structure                   |
| Security            | Hardcoded secrets, AWS keys, private keys, eval/innerHTML/SQL injection, unrestricted CORS, missing .gitignore/.env   |
| Quality             | Test framework, linting, type checking, formatting, CI/CD, empty catch blocks, TODO accumulation, test coverage ratio |
| Migration Readiness | Legacy stack detection, global state pollution, TypeScript adoption, documentation, test safety net                   |

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

| Preset        | Commit | PR  | Deploy | Relaxed Rules                                     |
| ------------- | ------ | --- | ------ | ------------------------------------------------- |
| `strict`      | 80     | 85  | 90     | None                                              |
| `recommended` | 60     | 70  | 80     | None                                              |
| `lenient`     | 40     | 50  | 60     | console-log, todo-marker, type-assertion disabled |

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

## Baseline Tracking

Track quality score over time with snapshots:

```bash
# Save a baseline snapshot
npx forge-ai-init baseline

# After making changes, compare against the baseline
npx forge-ai-init baseline --compare
```

**Compare output:**

```
  Score: 72 → 85 (▲ +13)
  Grade: C → B changed
  Files: 42 → 44

  ✓ 8 findings resolved
  ✗ 2 new findings

  Category changes:
    error-handling       5 → 2 (-3)
    security             3 → 1 (-2)
    engineering          2 → 5 (+3)
```

Baselines are stored in `.forge/baseline.json` as a history array — each `baseline` call appends a new snapshot for trend tracking.

## Architecture Planning

Run `plan` to generate an architecture-first analysis of any project:

```bash
npx forge-ai-init plan
npx forge-ai-init plan --json
```

Analyzes project structure, detects risks, generates recommendations, suggests ADRs, and defines quality gates:

- **Structure analysis** — file counts, test ratio, entry points, top-level directories
- **Risk detection** — missing CI, no type checking, low test ratio, security findings, architecture issues
- **Recommendations** — prioritized as must/should/could with specific actions
- **ADR suggestions** — architecture style, testing strategy, monorepo strategy
- **Scaling strategy** — framework-specific guidance (Edge-first for Next.js, horizontal for Express, ASGI for FastAPI)
- **Quality gates** — 3-phase progressive enforcement (40% foundation → 60% stabilization → 80% production)

## Health Monitoring

Run `doctor` for continuous architecture health checks:

```bash
npx forge-ai-init doctor
npx forge-ai-init doctor --json
```

11 health checks across 5 categories:

| Category     | Checks                                              |
| ------------ | --------------------------------------------------- |
| Architecture | God files, function sprawl                          |
| Security     | Critical findings, security vulnerabilities          |
| Governance   | CI/CD, linting, type checking, CLAUDE.md, ARCH.md   |
| Quality      | Score threshold, error handling patterns             |

Integrates with baseline tracking for trend detection (improving/stable/degrading). Calculates coupling and complexity scores.

## Quality Gate

Run `gate` to enforce quality thresholds in CI/CD:

```bash
# Auto-detect phase and threshold
npx forge-ai-init gate

# Explicit phase and threshold
npx forge-ai-init gate --phase production --threshold 80

# Machine-readable for CI
npx forge-ai-init gate --json
```

Exit code 0 = passed, 1 = failed. Phase auto-detection from score: foundation (<60), stabilization (60-80), production (80+).

Blocking rules per phase:
- **Foundation/Stabilization** — blocks on critical severity findings
- **Production** — blocks on critical AND high severity findings

Reads thresholds from `.forgerc.json` deploy threshold. Use in CI:

```yaml
- name: Quality gate
  run: npx forge-ai-init gate --phase production --threshold 80
```

## Golden Path Templates

Run `scaffold` to create new projects from opinionated templates with governance built in:

```bash
# List available templates
npx forge-ai-init scaffold

# Create a project
npx forge-ai-init scaffold --template nextjs-app --name my-app
npx forge-ai-init scaffold --template express-api --name my-api
npx forge-ai-init scaffold --template fastapi-service --name my-svc
npx forge-ai-init scaffold --template ts-library --name my-lib
npx forge-ai-init scaffold --template cli-tool --name my-cli
```

Every template includes `.gitignore`, `CLAUDE.md`, and `.forgerc.json` from day one. No governance debt.

| Template          | Description                         | Includes                            |
| ----------------- | ----------------------------------- | ----------------------------------- |
| `nextjs-app`      | Next.js App Router with TypeScript  | React 19, ESLint, Jest, tsconfig    |
| `express-api`     | Express API with Zod validation     | Express 5, Zod, tsx, tsup           |
| `fastapi-service` | FastAPI service with pytest         | FastAPI, uvicorn, ruff, mypy        |
| `ts-library`      | TypeScript library with tsup        | tsup, Jest, ESM                     |
| `cli-tool`        | CLI tool with @clack/prompts        | @clack/prompts, picocolors, tsx     |

## Legacy Migration Mode

Use `--migrate` to add governance to existing legacy projects. This mode adds:

- **Migration governance rules** — Strangler fig pattern, ADRs, incremental typing, backward-compatible APIs, feature flags for migration
- **migration-audit skill** — Full codebase health assessment: code quality, architecture, tests, security, scalability risks
- **tech-debt-review skill** — Categorized debt identification with impact/effort scoring matrix
- **dependency-audit skill** — Security vulnerabilities, outdated packages, license compliance, bundle impact
- **Progressive Quality Gates** — phased enforcement that increases thresholds as migration progresses:

| Phase         | Threshold | Focus                               |
| ------------- | --------- | ----------------------------------- |
| Initial       | 40%       | Critical security, basic tests      |
| Stabilization | 60%       | Linting, type safety, test coverage |
| Production    | 80%       | Full governance enforcement         |

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

| Tool           | Files Generated                                                      |
| -------------- | -------------------------------------------------------------------- |
| Claude Code    | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`, `.mcp.json` |
| Cursor         | `.cursorrules`                                                       |
| Windsurf       | `.windsurfrules`                                                     |
| GitHub Copilot | `.github/copilot-instructions.md`                                    |

## Enterprise Policy Engine

The enterprise tier generates a `.forge/` directory with policy files compatible with [`@forgespace/core`](https://www.npmjs.com/package/@forgespace/core):

- **Security policy** — secret exposure detection, authentication enforcement
- **Quality policy** — lint checks, test requirements, coverage thresholds
- **Compliance policy** — audit logging, correlation IDs
- **Framework policies** — a11y (React/Next.js), bundle size (Next.js), API validation (Express/NestJS/FastAPI)
- **Scorecard config** — framework-aware weights for automated project scoring
- **CI workflows** — `scorecard.yml` and `policy-check.yml` for PR-level enforcement

## CI/CD Integration

### GitHub Actions

#### Quality Gate on Pull Requests

```yaml
name: AI Governance
on: [pull_request]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan for anti-patterns
        run: npx forge-ai-init migrate --format json --output scan.json

      - name: Check quality gate
        run: |
          SCORE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('scan.json','utf8')).score)")
          echo "Score: $SCORE/100"
          if [ "$SCORE" -lt 60 ]; then
            echo "::error::Quality gate failed ($SCORE < 60)"
            exit 1
          fi

      - name: Upload SARIF to Security tab
        if: always()
        run: npx forge-ai-init migrate --format sarif --output results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

#### Staged Scan (Fast PR Check)

For faster CI on large repos, scan only changed files:

```yaml
- name: Scan changed files only
  run: |
    git diff --name-only origin/main...HEAD > /tmp/changed.txt
    npx forge-ai-init migrate --staged --json
```

#### Governance Audit

Check if a project meets governance standards before deploy:

```yaml
- name: Governance audit
  run: |
    npx forge-ai-init check --dir . 2>&1 | tee audit.txt
    # Parse grade from output
    if grep -q "Grade: F" audit.txt; then
      echo "::error::Governance audit failed"
      exit 1
    fi
```

#### Full Pipeline (Scan + Assess + Audit)

```yaml
name: AI Governance Suite
on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx forge-ai-init migrate --format sarif --output results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif

  assess:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Migration assessment
        run: npx forge-ai-init assess --format markdown --output assessment.md
      - name: Post assessment as PR comment
        uses: actions/github-script@v8
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('assessment.md', 'utf8');
            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body: `## AI Governance Assessment\n\n${body}`
            });

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx forge-ai-init check
```

### GitLab CI

```yaml
ai-governance:
  image: node:22
  stage: test
  script:
    - npx forge-ai-init migrate --format json --output scan.json
    - |
      SCORE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('scan.json','utf8')).score)")
      echo "Score: $SCORE/100"
      [ "$SCORE" -ge 60 ] || exit 1
  artifacts:
    reports:
      sast: results.sarif
    paths:
      - scan.json
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

### Pre-Commit Hook

Add to your project's pre-commit (works with Husky, lefthook, or plain git hooks):

```bash
#!/bin/sh
# .husky/pre-commit or .git/hooks/pre-commit

npx forge-ai-init migrate --staged --json > /tmp/forge-scan.json
SCORE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/forge-scan.json','utf8')).score)")

if [ "$SCORE" -lt 60 ]; then
  echo "Governance check failed: $SCORE/100 (minimum: 60)"
  echo "Run 'npx forge-ai-init migrate' to see details"
  exit 1
fi
```

### Configuring Thresholds

Use `.forgerc.json` to set different thresholds per stage:

```json
{
  "extends": "recommended",
  "thresholds": {
    "commit": 60,
    "pr": 70,
    "deploy": 80
  }
}
```

Then reference in CI:

```bash
THRESHOLD=$(node -e "
  const c = JSON.parse(require('fs').readFileSync('.forgerc.json','utf8'));
  console.log(c.thresholds?.pr ?? 70)
")
npx forge-ai-init migrate --json | node -e "
  let d='';process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const r=JSON.parse(d);
    console.log('Score:',r.score,'/ Threshold:',${THRESHOLD});
    process.exit(r.score < ${THRESHOLD} ? 1 : 0)
  })
"
```

### Badge Generation

Add a governance score badge to your README:

```bash
# Generate badge URL from scan score
SCORE=$(npx forge-ai-init migrate --json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).score))")
GRADE=$(npx forge-ai-init migrate --json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).grade))")
COLOR=$( [ "$SCORE" -ge 90 ] && echo "brightgreen" || [ "$SCORE" -ge 75 ] && echo "green" || [ "$SCORE" -ge 60 ] && echo "yellow" || echo "red" )

echo "![Governance](https://img.shields.io/badge/governance-${GRADE}%20${SCORE}%25-${COLOR})"
```

## License

MIT
