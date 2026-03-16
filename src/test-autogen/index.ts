import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DetectedStack } from "../types.js";
import { validateBypass } from "./bypass.js";
import { isProductionSource, toStackKind } from "./classifiers.js";
import { readChangedFiles } from "./git.js";
import { buildRequirements } from "./requirements.js";
import { renderTemplate } from "./templates.js";
import { appendJsonLine, ensureDirectory, updateBaseline } from "./telemetry.js";
import type { TestAutogenOptions, TestAutogenResult } from "./types.js";

export type {
  BypassValidation,
  TestAutogenOptions,
  TestAutogenRequirement,
  TestAutogenResult,
  TestScope,
} from "./types.js";

function makeBaseResult(
  stack: "node" | "python" | "unsupported",
  changedFiles: string[],
): TestAutogenResult {
  return {
    passed: true,
    stack,
    changedFiles,
    requirements: [],
    created: [],
    existing: [],
    missing: [],
    bypassed: false,
    telemetryPath: ".forge/test-autogen-telemetry.jsonl",
  };
}

export function runTestAutogen(
  projectDir: string,
  stack: DetectedStack,
  options: TestAutogenOptions = {},
): TestAutogenResult {
  const changedFiles = readChangedFiles(projectDir, options);
  const stackKind = toStackKind(stack);
  const now = new Date();
  const bypass = validateBypass(now);
  const result = makeBaseResult(stackKind, changedFiles);
  const telemetryFile = join(projectDir, result.telemetryPath);

  if (bypass.active && !bypass.valid) {
    result.passed = false;
    result.missing.push(bypass.error ?? "Bypass denied.");
    appendJsonLine(telemetryFile, {
      timestamp: now.toISOString(),
      event: "test-autogen",
      passed: false,
      bypassActive: true,
      bypassError: bypass.error,
    });
    return result;
  }

  if (bypass.active && bypass.valid) {
    result.bypassed = true;
    result.bypassReason = bypass.reason;
    result.bypassExpiresAt = bypass.expiresAt;
    appendJsonLine(join(projectDir, ".forge", "test-autogen-audit.jsonl"), {
      timestamp: now.toISOString(),
      event: "bypass-approved",
      reason: bypass.reason,
      expiresAt: bypass.expiresAt,
    });
    appendJsonLine(telemetryFile, {
      timestamp: now.toISOString(),
      event: "test-autogen",
      passed: true,
      bypassed: true,
      changedFiles: changedFiles.length,
    });
    return result;
  }

  if (stackKind === "unsupported" || changedFiles.length === 0) {
    appendJsonLine(telemetryFile, {
      timestamp: now.toISOString(),
      event: "test-autogen",
      passed: true,
      stack: stackKind,
      changedFiles: changedFiles.length,
    });
    return result;
  }

  const changedSources = changedFiles.filter((file) =>
    isProductionSource(file, stack),
  );
  result.requirements = buildRequirements(stack, stackKind, changedSources, projectDir);

  for (const requirement of result.requirements) {
    const fullPath = join(projectDir, requirement.testFile);
    if (existsSync(fullPath)) {
      result.existing.push(requirement.testFile);
      continue;
    }

    result.missing.push(requirement.testFile);
    if (options.write) {
      ensureDirectory(fullPath);
      writeFileSync(fullPath, renderTemplate(stackKind, requirement));
      result.created.push(requirement.testFile);
    }
  }

  if (options.write && result.created.length > 0) {
    result.missing = result.missing.filter(
      (file) => !result.created.includes(file),
    );
  }

  result.passed = !options.check || result.missing.length === 0;

  appendJsonLine(telemetryFile, {
    timestamp: now.toISOString(),
    event: "test-autogen",
    passed: result.passed,
    stack: stackKind,
    changedFiles: changedFiles.length,
    requirements: result.requirements.length,
    created: result.created.length,
    missing: result.missing.length,
  });

  updateBaseline(projectDir, result.created.length, result.missing.length);

  return result;
}

export function toActionFindings(
  result: TestAutogenResult,
): Array<{ file: string; rule: string; severity: string; message: string }> {
  return result.missing.map((file) => ({
    file,
    rule: "test-autogen-missing",
    severity:
      file.includes(".e2e.") || file.includes("/e2e/") ? "medium" : "high",
    message: `Required test missing: ${file}`,
  }));
}

export function summarizeTestAutogen(result: TestAutogenResult): string {
  const parts = [
    `changed=${result.changedFiles.length}`,
    `requirements=${result.requirements.length}`,
    `created=${result.created.length}`,
    `missing=${result.missing.length}`,
  ];
  if (result.bypassed) {
    parts.push("bypassed=true");
  }
  return `test-autogen ${parts.join(" ")}`;
}
