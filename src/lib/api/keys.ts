import { createHash, randomBytes } from "node:crypto";

/**
 * API keys are shown to the user exactly once, at creation. We persist only a
 * SHA-256 hash, so a leaked database row can't be used to call the API.
 */

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateApiKey(): { token: string; hash: string; lastFour: string } {
  const token = `tos_live_${randomBytes(24).toString("base64url")}`;
  return { token, hash: hashApiKey(token), lastFour: token.slice(-4) };
}
