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
├── index.ts            # CLI entry point (bin)
├── detector.ts         # Stack detection engine
├── types.ts            # Shared type definitions
├── utils.ts            # File writing utilities
├── generators/         # Output generators
│   ├── claude-md.ts    # CLAUDE.md + .cursorrules + copilot
│   ├── settings.ts     # .claude/settings.json
│   ├── skills.ts       # .claude/skills/ generator
│   ├── mcp-config.ts   # .mcp.json generator
│   ├── policies.ts     # .forge/policies/
│   └── workflows.ts    # .github/workflows/
└── templates/
    ├── rules/          # Rule content by concern
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
    │   └── express.ts        # Express-specific
    └── skills/         # Skill SKILL.md templates (9 total)
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
