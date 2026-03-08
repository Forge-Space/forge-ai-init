# forge-ai-init

**AI Governance Layer** — one command to add AI coding rules, skills, hooks, and quality gates to any project.

AI tools generate code fast, but without governance: no architecture patterns, no security rules, no quality gates, no technical conscience. `forge-ai-init` adds the missing layer.

## Quick Start

```bash
npx forge-ai-init
```

Detects your stack, asks your preferences, generates governance files. Done.

## What It Generates

```
your-project/
├── CLAUDE.md                          # AI coding rules (Claude Code)
├── .cursorrules                       # Cursor rules
├── .windsurfrules                     # Windsurf rules
├── .github/copilot-instructions.md    # GitHub Copilot rules
├── .claude/
│   ├── settings.json                  # Permission model + hooks
│   └── skills/
│       ├── quality-gate/SKILL.md      # Pre-PR quality checks
│       ├── security-check/SKILL.md    # OWASP + dependency audit
│       ├── arch-review/SKILL.md       # Architecture enforcement
│       └── test-first/SKILL.md        # TDD enforcement
├── .mcp.json                          # MCP server configs
└── .github/workflows/                 # (or .gitlab-ci.yml)
    ├── ci.yml                         # Lint, build, test, audit
    └── secret-scan.yml                # TruffleHog scanning
```

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

| Tier | For | What's generated |
|------|-----|------------------|
| **Lite** | Solo dev, prototypes | Rules + hooks |
| **Standard** | Teams, production | Rules + skills + MCP + CI |
| **Enterprise** | Organizations | Standard + compliance + ADR templates |

## CLI Usage

```bash
# Interactive (default)
npx forge-ai-init

# Non-interactive
npx forge-ai-init --tier standard --tools claude,cursor --yes

# Preview without writing
npx forge-ai-init --dry-run

# Overwrite existing files
npx forge-ai-init --force

# Target a specific directory
npx forge-ai-init --dir /path/to/project
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dir <path>` | Target project directory | `.` |
| `--tier <level>` | Governance tier: `lite`, `standard`, `enterprise` | `standard` |
| `--tools <list>` | AI tools: `claude`, `cursor`, `windsurf`, `copilot` | `claude` |
| `--force` | Overwrite existing files | `false` |
| `--dry-run` | Show what would be created | `false` |
| `--yes` | Skip interactive prompts | `false` |

## AI Tool Support

| Tool | Files Generated |
|------|----------------|
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`, `.mcp.json` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

## Why?

GitClear's analysis of 211M lines of code shows AI-assisted projects have **60% less refactored code**, **48% more copy-paste patterns**, and **2x code churn**. Ox Security found **10 recurring anti-patterns in 80-100% of AI-generated codebases**.

The problem isn't AI coding — it's AI coding **without governance**.

`forge-ai-init` gives your AI tools the rules, skills, and guardrails to produce quality code from the start.

## License

MIT
