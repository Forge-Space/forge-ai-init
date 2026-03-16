import type { Policy } from "./types.js";

export function securityPolicy(): Policy {
  return {
    id: "forge-security",
    name: "Forge Security Policy",
    version: "1.0.0",
    description: "Zero secrets, authentication enforcement",
    rules: [
      {
        id: "sec-001",
        name: "Block secret exposure",
        description: "Block content containing credentials",
        conditions: [
          {
            field: "content",
            operator: "matches",
            value:
              "(password|secret|api_key|private_key|token)\\s*[:=]\\s*['\"][^'\"]{8,}",
          },
        ],
        actions: [{ type: "block", message: "Content contains potential secret" }],
        enabled: true,
      },
      {
        id: "sec-002",
        name: "Unauthenticated access",
        description: "Block unauthenticated requests",
        conditions: [
          { field: "auth.authenticated", operator: "eq", value: false },
        ],
        actions: [{ type: "block", message: "Authentication required" }],
        enabled: true,
      },
    ],
  };
}

export function qualityPolicy(): Policy {
  return {
    id: "forge-quality",
    name: "Forge Quality Policy",
    version: "1.0.0",
    description: "Lint pass, test existence, coverage threshold",
    rules: [
      {
        id: "qual-001",
        name: "Lint check required",
        description: "Block if lint check has not passed",
        conditions: [
          { field: "quality.lint_passed", operator: "eq", value: false },
        ],
        actions: [{ type: "block", message: "Lint check must pass" }],
        enabled: true,
      },
      {
        id: "qual-002",
        name: "Tests required",
        description: "Block if no tests exist for new modules",
        conditions: [
          { field: "quality.has_tests", operator: "eq", value: false },
        ],
        actions: [{ type: "block", message: "Tests are required for new modules" }],
        enabled: true,
      },
      {
        id: "qual-003",
        name: "Coverage threshold",
        description: "Warn if test coverage drops below 80%",
        conditions: [
          { field: "quality.coverage_percent", operator: "lt", value: 80 },
        ],
        actions: [{ type: "warn", message: "Test coverage below 80%" }],
        enabled: true,
      },
    ],
  };
}

export function compliancePolicy(): Policy {
  return {
    id: "forge-compliance",
    name: "Forge Compliance Policy",
    version: "1.0.0",
    description: "RLS, audit logging, structured logging",
    rules: [
      {
        id: "comp-001",
        name: "Audit logging required",
        description: "Warn if audit logging is not configured",
        conditions: [
          { field: "compliance.audit_logging", operator: "eq", value: false },
        ],
        actions: [{ type: "warn", message: "Audit logging should be enabled" }],
        enabled: true,
      },
      {
        id: "comp-002",
        name: "Correlation IDs required",
        description: "Warn if requests lack correlation IDs",
        conditions: [
          { field: "request.correlation_id", operator: "eq", value: null },
        ],
        actions: [
          { type: "warn", message: "Requests should include correlation ID" },
        ],
        enabled: true,
      },
    ],
  };
}
