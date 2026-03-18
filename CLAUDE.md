# forge-ai-init

AI Governance Layer CLI that scaffolds rules, skills, hooks, and quality gates into projects.

## Quick Reference

```bash
npm run build           # tsup build (ESM)
npm test                # Jest ESM (56 suites, 1088 tests)
npm run test:coverage   # Coverage report (98%+ stmts, 95%+ branches)
npm run dev             # Run CLI via tsx
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm run validate        # lint + typecheck + build + test
./scripts/release.sh <major|minor|patch>
```

## Structure

```text
src/
|- index.ts            # CLI entrypoint
|- api.ts              # Public API re-exports
|- types.ts            # Shared type definitions
|- shared.ts           # Shared utilities/constants
|- config.ts           # .forgerc.json loader
|- baseline.ts         # Quality snapshots
|- doctor.ts           # Health monitoring
|- gate.ts             # CI quality gate
|- ci-command.ts       # CI helper command
|- diff-analyzer.ts    # PR quality delta
|- tenant-profile.ts   # Tenant context loader
|- generator.ts        # Generator orchestrator
|- updater.ts          # Smart regeneration
|- detector.ts         # 1-line facade -> src/detector/
|- scanner.ts          # 1-line facade -> src/scanner/
|- scaffold.ts         # 1-line facade -> src/scaffold/
|- reporter.ts         # 1-line facade -> src/reporter/
|- checker.ts          # facade -> src/checkers/
|- assessor.ts         # facade -> src/assessors/
|- test-autogen.ts     # facade -> src/test-autogen/
|- migrate-analyzer.ts # facade -> src/migrate-analyzer/
|- planner.ts          # facade -> src/planner/
|- rules/              # 10 category files, 115 rules
|- commands/           # 15 command handler modules
|- checkers/           # 7 checker sub-modules
|- assessors/          # 6 assessor sub-modules
|- test-autogen/       # 8 sub-modules
|- detector/           # 6 sub-modules
|- scanner/            # 6 sub-modules
|- scaffold/           # 9 sub-modules
|- reporter/           # 6 sub-modules
|- migrate-analyzer/   # 8 sub-modules
|- planner/            # 8 sub-modules
`- generators/
   |- claude-md.ts
   |- settings.ts
   |- skills.ts
   |- mcp-config.ts
   |- git-hooks.ts
   |- config-scaffold.ts
   |- policies/        # split sub-modules
   |- workflows/       # split sub-modules
   `- migration/       # split sub-modules
```

## Stack

TypeScript, Node 22, tsup, Jest (ESM), @clack/prompts, picocolors

## Conventions

- Functions < 50 lines when practical, complexity < 10
- Conventional commits
- Avoid comments unless needed for non-obvious logic
- Generated files must be standalone (no runtime dependency on forge-ai-init)

## Testing

- Use temp directories for filesystem-heavy tests
- Test generators independently and through integration flows
- Keep branch coverage above gate thresholds
- Current baseline: 56 suites, 1088 tests
