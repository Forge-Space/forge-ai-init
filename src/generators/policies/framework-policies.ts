import type { DetectedStack } from "../../types.js";
import type { Policy, PolicyRule } from "./types.js";

export function frameworkRules(stack: DetectedStack): PolicyRule[] {
  const rules: PolicyRule[] = [];

  if (stack.framework === "nextjs" || stack.framework === "react") {
    rules.push({
      id: "fw-001",
      name: "Accessibility required",
      description: "Warn if components lack ARIA attributes",
      conditions: [
        { field: "quality.a11y_passed", operator: "eq", value: false },
      ],
      actions: [
        { type: "warn", message: "Components must pass accessibility checks" },
      ],
      enabled: true,
    });
  }

  if (stack.framework === "nextjs") {
    rules.push({
      id: "fw-002",
      name: "Bundle size limit",
      description: "Warn if JS bundle exceeds 300 KB gzipped",
      conditions: [
        { field: "performance.bundle_size_kb", operator: "gt", value: 300 },
      ],
      actions: [{ type: "warn", message: "JS bundle exceeds 300 KB gzipped" }],
      enabled: true,
    });
  }

  if (
    stack.framework === "express" ||
    stack.framework === "nestjs" ||
    stack.framework === "fastapi"
  ) {
    rules.push({
      id: "fw-003",
      name: "API input validation",
      description: "Block if API endpoints lack input validation",
      conditions: [
        { field: "security.unvalidated_endpoints", operator: "gt", value: 0 },
      ],
      actions: [
        { type: "block", message: "API endpoints must validate input" },
      ],
      enabled: true,
    });
  }

  return rules;
}

export function makeFrameworkPolicy(stack: DetectedStack): Policy | null {
  const fwRules = frameworkRules(stack);
  if (fwRules.length === 0) return null;
  return {
    id: "forge-framework",
    name: "Forge Framework Policy",
    version: "1.0.0",
    description: `Framework-specific rules for ${stack.framework}`,
    rules: fwRules,
  };
}

export function scorecardConfig(stack: DetectedStack): Record<string, unknown> {
  const weights: Record<string, number> = {
    security: 25,
    quality: 30,
    performance: 20,
    compliance: 25,
  };

  if (stack.framework === "nextjs") {
    weights.performance = 30;
    weights.compliance = 20;
  }

  if (
    stack.framework === "express" ||
    stack.framework === "fastapi" ||
    stack.framework === "nestjs"
  ) {
    weights.security = 35;
    weights.performance = 15;
  }

  return {
    threshold: 60,
    collectors: ["security", "quality", "performance", "compliance"],
    output: "summary",
    weights,
  };
}
