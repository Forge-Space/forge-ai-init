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

export interface BypassValidation {
  active: boolean;
  valid: boolean;
  reason?: string;
  expiresAt?: string;
  error?: string;
}
