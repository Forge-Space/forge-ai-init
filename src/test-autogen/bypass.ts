import type { BypassValidation } from "./types.js";

export function validateBypass(now: Date): BypassValidation {
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

  return { active, valid: true, reason, expiresAt };
}
