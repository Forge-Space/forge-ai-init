import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { TestAutogenOptions } from "./types.js";

const GIT_CANDIDATES = [
  "/usr/bin/git",
  "/usr/local/bin/git",
  "/bin/git",
  "C:\\Program Files\\Git\\cmd\\git.exe",
];

const SAFE_GIT_REF = /^[A-Za-z0-9._/-]+$/;

export function sanitizeGitRef(ref?: string): string | undefined {
  if (!ref) return undefined;
  if (!SAFE_GIT_REF.test(ref)) return undefined;
  if (ref.startsWith("-")) return undefined;
  return ref;
}

export function resolveGitBinary(): string {
  for (const candidate of GIT_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Git binary not found in expected locations");
}

export function runGitCommand(projectDir: string, args: string[]): string {
  try {
    return execFileSync(resolveGitBinary(), args, {
      cwd: projectDir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

export function readChangedFiles(
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
