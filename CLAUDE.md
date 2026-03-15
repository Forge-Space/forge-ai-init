# forge-ai-init

AI Governance Layer CLI — scaffolds coding rules, skills, hooks, and quality gates onto any project.

## Quick Reference

```bash
npm run build           # tsup build
npm test                # Jest unit tests
npm run dev             # Run CLI via tsx
npm run lint            # ESLint
npm run typecheck       # TypeScript check
npm run validate        # lint + typecheck + build + test
```

## Structure

```
src/
├── index.ts            # CLI entry point (bin, 13 commands)
├── api.ts              # Public API re-exports
├── types.ts            # Shared type definitions
├── shared.ts           # Shared utilities (walkFiles, scoreToGrade, readJson, constants)
├── utils.ts            # File writing utilities
├── detector.ts         # Stack detection engine (7 languages, 14 frameworks)
├── generator.ts        # Orchestrates all generators
├── config.ts           # .forgerc.json config loader
├── checker.ts          # Governance audit engine (A-F grading)
├── scanner.ts          # Code anti-pattern scanner (119 rules, 10 categories)
├── assessor.ts         # Migration health assessment
├── baseline.ts         # Quality score snapshots
├── planner.ts          # Architecture planning
├── doctor.ts           # Health monitoring
├── gate.ts             # CI quality gate
├── scaffold.ts         # Golden path templates (5 templates)
├── ci-command.ts       # CI pipeline generator
├── diff-analyzer.ts    # PR quality delta
├── migrate-analyzer.ts # Migration roadmap
├── reporter.ts         # SARIF/Markdown/JSON reporter
├── updater.ts          # Smart re-generation
├── test-autogen.ts     # Auto test generation/enforcement
├── tenant-profile.ts   # Tenant context loader
├── generators/         # Output generators
│   ├── claude-md.ts    # CLAUDE.md + .cursorrules + copilot
│   ├── settings.ts     # .claude/settings.json
│   ├── skills.ts       # .claude/skills/ generator
│   ├── mcp-config.ts   # .mcp.json generator
│   ├── policies.ts     # .forge/policies/
│   ├── workflows.ts    # .github/workflows/
│   ├── migration.ts    # MIGRATION.md + ADR
│   ├── git-hooks.ts    # .githooks/ generator
│   └── config-scaffold.ts # .forgerc.json scaffold
└── templates/
    ├── rules/          # Rule content by language/framework (16 templates)
    │   ├── common.ts         # Architecture, security, quality
    │   ├── ai-governance.ts  # AI anti-patterns, governance
    │   ├── scalability.ts    # Performance, scaling
    │   ├── migration.ts      # Legacy migration
    │   ├── typescript.ts     # TS-specific
    │   ├── nextjs.ts         # Next.js-specific
    │   ├── react.ts          # React-specific
    │   ├── vue.ts            # Vue-specific
    │   ├── node.ts           # Node.js-specific
    │   ├── python.ts         # Python-specific
    │   ├── express.ts        # Express-specific
    │   ├── go.ts             # Go-specific
    │   ├── rust.ts           # Rust-specific
    │   ├── java.ts           # Java-specific
    │   ├── kotlin.ts         # Kotlin-specific
    │   └── svelte.ts         # Svelte-specific
    └── skills/         # Skill SKILL.md templates (10 total)
```

## Stack

TypeScript, Node 22, tsup, Jest (ESM), @clack/prompts, picocolors

## Conventions

- Functions <50 lines, complexity <10
- Conventional commits
- No comments unless needed
- Generated files must be standalone (no runtime dep on forge-ai-init)

## Testing

- Real filesystem tests using temp directories
- Test each generator independently
- Integration test: run CLI on temp project, verify output
- 25 test suites, 484+ tests
