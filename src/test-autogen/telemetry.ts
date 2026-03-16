import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

export function ensureDirectory(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function appendJsonLine(
  filePath: string,
  payload: Record<string, unknown>,
): void {
  ensureDirectory(filePath);
  appendFileSync(filePath, `${JSON.stringify(payload)}\n`);
}

export function updateBaseline(
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
