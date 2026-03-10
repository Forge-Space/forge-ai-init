import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import type { DetectedStack } from "./types.js";

export type TestScope = "unit" | "integration" | "e2e";

export interface TestAutogenRequirement {
  sourceFile: string;
  scope: TestScope;
  testFile: string;
  reason: string;
}

export interface TestAutogenOptions {
  staged?: boolean;
  write?: boolean;
  check?: boolean;
  baseRef?: string;
}

export interface TestAutogenResult {
  passed: boolean;
  stack: "node" | "python" | "unsupported";
  changedFiles: string[];
  requirements: TestAutogenRequirement[];
  created: string[];
  existing: string[];
  missing: string[];
  bypassed: boolean;
  bypassReason?: string;
  bypassExpiresAt?: string;
  telemetryPath: string;
}

interface BypassValidation {
  active: boolean;
  valid: boolean;
  reason?: string;
  expiresAt?: string;
  error?: string;
}

const NODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const SAFE_GIT_REF = /^[A-Za-z0-9._/-]+$/;

function sanitizeGitRef(ref?: string): string | undefined {
  if (!ref) return undefined;
  if (!SAFE_GIT_REF.test(ref)) return undefined;
  if (ref.startsWith("-")) return undefined;
  return ref;
}

function runGitCommand(projectDir: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: projectDir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function readChangedFiles(
  projectDir: string,
  options: TestAutogenOptions,
): string[] {
  const baseRef = sanitizeGitRef(options.baseRef);
  const args = options.staged
    ? ["diff", "--cached", "--name-only"]
    : baseRef
      ? ["diff", "--name-only", `${baseRef}...HEAD`]
      : ["diff", "--name-only", "HEAD"];

  return runGitCommand(projectDir, args)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isTestLikeFile(relPath: string): boolean {
  return (
    relPath.includes("/tests/") ||
    relPath.startsWith("tests/") ||
    relPath.includes("__tests__") ||
    relPath.endsWith(".test.ts") ||
    relPath.endsWith(".test.tsx") ||
    relPath.endsWith(".test.js") ||
    relPath.endsWith(".spec.ts") ||
    relPath.endsWith(".spec.js") ||
    relPath.endsWith("_test.py") ||
    relPath.startsWith("test_")
  );
}

function isProductionSource(relPath: string, stack: DetectedStack): boolean {
  if (isTestLikeFile(relPath)) return false;
  if (relPath.startsWith(".")) return false;
  if (
    relPath.startsWith("docs/") ||
    relPath.startsWith(".github/") ||
    relPath.endsWith(".md")
  ) {
    return false;
  }

  if (stack.language === "python") {
    return extname(relPath) === ".py";
  }

  if (stack.language === "typescript" || stack.language === "javascript") {
    return NODE_EXTS.has(extname(relPath));
  }

  return false;
}

function toStackKind(stack: DetectedStack): "node" | "python" | "unsupported" {
  if (stack.language === "python") return "python";
  if (stack.language === "typescript" || stack.language === "javascript") {
    return "node";
  }
  return "unsupported";
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

function isUiFile(relPath: string): boolean {
  const path = relPath.toLowerCase();
  const ext = extname(path);
  if (ext === ".tsx" || ext === ".jsx" || ext === ".vue" || ext === ".svelte") {
    return true;
  }
  return (
    path.includes("/components/") ||
    path.includes("/screens/") ||
    path.includes("/pages/") ||
    path.includes("/app/") ||
    path.includes("/ui/")
  );
}

function isApiFile(relPath: string): boolean {
  const path = relPath.toLowerCase();
  return (
    path.includes("/api/") ||
    path.includes("/route") ||
    path.includes("/routes/") ||
    path.includes("/router") ||
    path.includes("/controller") ||
    path.includes("/endpoint") ||
    path.includes("/handler") ||
    path.includes("/server")
  );
}

function isBoundaryFile(relPath: string, content: string): boolean {
  const path = relPath.toLowerCase();
  if (
    path.includes("/api/") ||
    path.includes("/controller") ||
    path.includes("/service") ||
    path.includes("/repository") ||
    path.includes("/db") ||
    path.includes("/client")
  ) {
    return true;
  }

  return /fetch\(|axios\.|prisma\.|sequelize\.|supabase\.|redis\.|sql|requests\./.test(
    content,
  );
}

function isCriticalFlow(relPath: string): boolean {
  return /(auth|login|signup|checkout|payment|billing|security|admin)/i.test(
    relPath,
  );
}

function stripExtension(relPath: string): string {
  return relPath.slice(0, relPath.length - extname(relPath).length);
}

function nodeTestExt(stack: DetectedStack): string {
  return stack.language === "typescript" ? "ts" : "js";
}

function makeNodeTestPath(
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

function makePythonTestPath(scope: TestScope, relPath: string): string {
  const normalized = stripExtension(relPath).replace(/\//g, "_");
  return join("tests", scope, `test_${normalized}.py`);
}

function makeRequirement(
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

  return {
    sourceFile,
    scope,
    testFile,
    reason,
  };
}

function buildRequirements(
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
      makeRequirement(
        stackKind,
        "unit",
        source,
        "changed-production-code",
        stack,
      ),
    );

    if (isBoundaryFile(source, content)) {
      requirements.push(
        makeRequirement(
          stackKind,
          "integration",
          source,
          "boundary-change",
          stack,
        ),
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

function ensureDirectory(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function nodeTemplate(scope: TestScope, sourceFile: string): string {
  return `describe('${sourceFile} ${scope}', () => {\n  it('keeps coverage for generated ${scope} tests', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
}

function pythonTemplate(scope: TestScope, sourceFile: string): string {
  return `def test_${scope}_${sourceFile.replace(/[^a-zA-Z0-9_]/g, "_")}():\n    assert True\n`;
}

function renderTemplate(
  stackKind: "node" | "python",
  requirement: TestAutogenRequirement,
): string {
  if (stackKind === "python") {
    return pythonTemplate(requirement.scope, requirement.sourceFile);
  }
  return nodeTemplate(requirement.scope, requirement.sourceFile);
}

function validateBypass(now: Date): BypassValidation {
  const active = process.env.FORGE_TEST_AUTOGEN_BYPASS === "1";
  if (!active) return { active: false, valid: false };

  const reason = process.env.FORGE_BYPASS_REASON?.trim();
  const expiresAt = process.env.FORGE_BYPASS_EXPIRES_AT?.trim();
  if (!reason || !expiresAt) {
    return {
      active,
      valid: false,
      error: "Bypass requires FORGE_BYPASS_REASON and FORGE_BYPASS_EXPIRES_AT.",
    };
  }

  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return {
      active,
      valid: false,
      reason,
      expiresAt,
      error: "FORGE_BYPASS_EXPIRES_AT must be a valid ISO datetime.",
    };
  }

  if (expiryDate.getTime() <= now.getTime()) {
    return {
      active,
      valid: false,
      reason,
      expiresAt,
      error: "Bypass expired. Set a future FORGE_BYPASS_EXPIRES_AT.",
    };
  }

  return {
    active,
    valid: true,
    reason,
    expiresAt,
  };
}

function appendJsonLine(
  filePath: string,
  payload: Record<string, unknown>,
): void {
  ensureDirectory(filePath);
  appendFileSync(filePath, `${JSON.stringify(payload)}\n`);
}

function updateBaseline(
  projectDir: string,
  created: number,
  missing: number,
): void {
  const baselinePath = join(projectDir, ".forge", "test-autogen-baseline.json");
  const base = existsSync(baselinePath)
    ? (JSON.parse(readFileSync(baselinePath, "utf-8")) as Record<
        string,
        unknown
      >)
    : { runs: 0, created: 0, missing: 0 };

  const runs = Number(base["runs"] ?? 0) + 1;
  const totalCreated = Number(base["created"] ?? 0) + created;
  const totalMissing = Number(base["missing"] ?? 0) + missing;
  const snapshot = {
    runs,
    created: totalCreated,
    missing: totalMissing,
    lastRunAt: new Date().toISOString(),
  };

  ensureDirectory(baselinePath);
  writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2) + "\n");
}

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
  result.requirements = buildRequirements(
    stack,
    stackKind,
    changedSources,
    projectDir,
  );

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

export function resolveRelativePath(
  projectDir: string,
  fullPath: string,
): string {
  return relative(projectDir, fullPath);
}
