import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { DetectedStack } from "../types.js";
import {
  isApiFile,
  isBoundaryFile,
  isCriticalFlow,
  isUiFile,
} from "./classifiers.js";
import type { TestAutogenRequirement, TestScope } from "./types.js";

function stripExtension(relPath: string): string {
  return relPath.slice(0, relPath.length - extname(relPath).length);
}

function nodeTestExt(stack: DetectedStack): string {
  return stack.language === "typescript" ? "ts" : "js";
}

export function makeNodeTestPath(
  scope: TestScope,
  relPath: string,
  stack: DetectedStack,
): string {
  const suffix =
    scope === "unit"
      ? "unit.test"
      : scope === "integration"
        ? "integration.test"
        : "e2e.test";
  return join(
    "tests",
    scope,
    `${stripExtension(relPath)}.${suffix}.${nodeTestExt(stack)}`,
  );
}

export function makePythonTestPath(scope: TestScope, relPath: string): string {
  const normalized = stripExtension(relPath).replace(/\//g, "_");
  return join("tests", scope, `test_${normalized}.py`);
}

export function makeRequirement(
  stackKind: "node" | "python",
  scope: TestScope,
  sourceFile: string,
  reason: string,
  stack: DetectedStack,
): TestAutogenRequirement {
  const testFile =
    stackKind === "python"
      ? makePythonTestPath(scope, sourceFile)
      : makeNodeTestPath(scope, sourceFile, stack);

  return { sourceFile, scope, testFile, reason };
}

function readText(projectDir: string, relPath: string): string {
  const fullPath = join(projectDir, relPath);
  if (!existsSync(fullPath)) return "";
  try {
    return readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

export function buildRequirements(
  stack: DetectedStack,
  stackKind: "node" | "python",
  changedSources: string[],
  projectDir: string,
): TestAutogenRequirement[] {
  const requirements: TestAutogenRequirement[] = [];
  const uiChanged = changedSources.some(isUiFile);
  const apiChanged = changedSources.some(isApiFile);

  for (const source of changedSources) {
    const content = readText(projectDir, source);
    requirements.push(
      makeRequirement(stackKind, "unit", source, "changed-production-code", stack),
    );

    if (isBoundaryFile(source, content)) {
      requirements.push(
        makeRequirement(stackKind, "integration", source, "boundary-change", stack),
      );
    }

    const needsE2E =
      isCriticalFlow(source) ||
      (uiChanged && apiChanged && (isUiFile(source) || isApiFile(source)));
    if (needsE2E) {
      requirements.push(
        makeRequirement(
          stackKind,
          "e2e",
          source,
          "critical-flow-or-ui-api-impact",
          stack,
        ),
      );
    }
  }

  return requirements;
}
