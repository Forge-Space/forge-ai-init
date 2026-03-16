import type { DetectedStack, Tier } from "../../types.js";
import {
  compliancePolicy,
  qualityPolicy,
  securityPolicy,
} from "./base-policies.js";
import {
  makeFrameworkPolicy,
  scorecardConfig,
} from "./framework-policies.js";
import {
  migrationProgressivePolicy,
  migrationScorecardConfig,
} from "./migration-policies.js";
import type { PolicyFile } from "./types.js";

export type { PolicyFile } from "./types.js";

export function generatePolicies(
  stack: DetectedStack,
  tier: Tier,
  migrate?: boolean,
): PolicyFile[] {
  if (tier !== "enterprise" && !migrate) return [];

  const files: PolicyFile[] = [];

  if (tier === "enterprise") {
    const policies = [securityPolicy(), qualityPolicy(), compliancePolicy()];

    for (const policy of policies) {
      files.push({
        path: `.forge/policies/${policy.id.replace("forge-", "")}.policy.json`,
        content: JSON.stringify(policy, null, 2) + "\n",
      });
    }

    const fwPolicy = makeFrameworkPolicy(stack);
    if (fwPolicy) {
      files.push({
        path: ".forge/policies/framework.policy.json",
        content: JSON.stringify(fwPolicy, null, 2) + "\n",
      });
    }

    files.push({
      path: ".forge/scorecard.json",
      content:
        JSON.stringify(
          migrate ? migrationScorecardConfig(stack) : scorecardConfig(stack),
          null,
          2,
        ) + "\n",
    });

    files.push({
      path: ".forge/features.json",
      content: JSON.stringify({ toggles: [], version: "1.0.0" }, null, 2) + "\n",
    });
  }

  if (migrate) {
    files.push({
      path: ".forge/policies/migration-progressive.policy.json",
      content: JSON.stringify(migrationProgressivePolicy(), null, 2) + "\n",
    });

    if (tier !== "enterprise") {
      files.push({
        path: ".forge/scorecard.json",
        content:
          JSON.stringify(migrationScorecardConfig(stack), null, 2) + "\n",
      });
    }
  }

  return files;
}
