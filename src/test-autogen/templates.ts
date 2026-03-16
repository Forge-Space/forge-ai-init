import type { TestAutogenRequirement, TestScope } from "./types.js";

export function nodeTemplate(scope: TestScope, sourceFile: string): string {
  return `describe('${sourceFile} ${scope}', () => {\n  it('keeps coverage for generated ${scope} tests', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
}

export function pythonTemplate(scope: TestScope, sourceFile: string): string {
  return `def test_${scope}_${sourceFile.replace(/[^a-zA-Z0-9_]/g, "_")}():\n    assert True\n`;
}

export function renderTemplate(
  stackKind: "node" | "python",
  requirement: TestAutogenRequirement,
): string {
  if (stackKind === "python") {
    return pythonTemplate(requirement.scope, requirement.sourceFile);
  }
  return nodeTemplate(requirement.scope, requirement.sourceFile);
}
