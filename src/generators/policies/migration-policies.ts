import type { DetectedStack } from "../../types.js";
import { scorecardConfig } from "./framework-policies.js";
import type { Policy } from "./types.js";

export function migrationProgressivePolicy(): Policy {
  return {
    id: "forge-migration-progressive",
    name: "Progressive Migration Quality Gates",
    version: "1.0.0",
    description:
      "Phased quality enforcement for legacy migration — thresholds increase as migration progresses",
    rules: [
      {
        id: "mig-001",
        name: "Phase 1: Initial (40% threshold)",
        description:
          "Minimum quality bar for initial migration — focus on critical security and basic tests",
        conditions: [
          { field: "migration.phase", operator: "eq", value: "initial" },
          { field: "quality.score", operator: "lt", value: 40 },
        ],
        actions: [
          {
            type: "block",
            message:
              "Quality score below 40% — fix critical security issues and add basic tests before proceeding",
          },
        ],
        enabled: true,
      },
      {
        id: "mig-002",
        name: "Phase 2: Stabilization (60% threshold)",
        description:
          "Mid-migration quality bar — enforce linting, type safety, and test coverage",
        conditions: [
          { field: "migration.phase", operator: "eq", value: "stabilization" },
          { field: "quality.score", operator: "lt", value: 60 },
        ],
        actions: [
          {
            type: "block",
            message:
              "Quality score below 60% — add type checking, linting, and increase test coverage",
          },
        ],
        enabled: true,
      },
      {
        id: "mig-003",
        name: "Phase 3: Production (80% threshold)",
        description: "Production-ready quality bar — full governance enforcement",
        conditions: [
          { field: "migration.phase", operator: "eq", value: "production" },
          { field: "quality.score", operator: "lt", value: 80 },
        ],
        actions: [
          {
            type: "block",
            message:
              "Quality score below 80% — meet full governance standards before production release",
          },
        ],
        enabled: true,
      },
      {
        id: "mig-004",
        name: "Characterization tests required",
        description:
          "Block migration of a module without characterization tests proving behavioral parity",
        conditions: [
          {
            field: "migration.has_characterization_tests",
            operator: "eq",
            value: false,
          },
        ],
        actions: [
          {
            type: "block",
            message:
              "Add characterization tests before migrating — they prove old and new behavior match",
          },
        ],
        enabled: true,
      },
      {
        id: "mig-005",
        name: "ADR required for strategy changes",
        description:
          "Warn if migration strategy changes without an Architecture Decision Record",
        conditions: [
          { field: "migration.strategy_changed", operator: "eq", value: true },
          { field: "migration.has_adr", operator: "eq", value: false },
        ],
        actions: [
          { type: "warn", message: "Document migration strategy changes in an ADR" },
        ],
        enabled: true,
      },
      {
        id: "mig-006",
        name: "Dependency modernization check",
        description:
          "Warn if migrated modules still depend on EOL or vulnerable packages",
        conditions: [
          { field: "dependencies.eol_count", operator: "gt", value: 0 },
        ],
        actions: [
          {
            type: "warn",
            message:
              "Migrated code still depends on end-of-life packages — update before production",
          },
        ],
        enabled: true,
      },
    ],
  };
}

export function migrationScorecardConfig(
  stack: DetectedStack,
): Record<string, unknown> {
  const base = scorecardConfig(stack) as Record<string, unknown>;
  return {
    ...base,
    threshold: 40,
    phases: {
      initial: { threshold: 40, focus: ["security"] },
      stabilization: { threshold: 60, focus: ["security", "quality"] },
      production: {
        threshold: 80,
        focus: ["security", "quality", "performance"],
      },
    },
    migration: {
      trackProgress: true,
      requireCharacterizationTests: true,
      requireADR: true,
    },
  };
}
