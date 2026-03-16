import { relative } from "node:path";

export {
  runTestAutogen,
  summarizeTestAutogen,
  toActionFindings,
} from "./test-autogen/index.js";

export type {
  BypassValidation,
  TestAutogenOptions,
  TestAutogenRequirement,
  TestAutogenResult,
  TestScope,
} from "./test-autogen/index.js";

export function resolveRelativePath(
  projectDir: string,
  fullPath: string,
): string {
  return relative(projectDir, fullPath);
}
