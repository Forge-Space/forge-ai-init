export function migrationRules(): string {
  return `## Legacy Migration Governance

- Migrate incrementally: strangler fig pattern — wrap legacy, build new alongside, redirect traffic, retire old
- Never rewrite from scratch — migrate module by module with tests proving parity
- Add tests BEFORE refactoring: characterization tests capture current behavior, then change safely
- Document every migration decision in ADRs (Architecture Decision Records)
- Type gradually: add TypeScript/type hints to files as you modify them, not all at once
- Dependency modernization: upgrade one major version at a time, run full test suite between upgrades
- Extract configuration: hardcoded values → environment variables → config service
- Decouple monoliths: identify bounded contexts first, then extract services at natural seams
- Database migrations: always reversible, always backward-compatible, zero-downtime deploys
- Feature flags for migration: toggle between old and new paths, compare outputs, roll back safely
- Preserve API contracts: existing consumers must not break — version new endpoints, deprecate old`;
}
