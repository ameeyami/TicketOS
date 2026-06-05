import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Slack request-signing verification (v0 scheme). The signing secret lives only
 * in the deployment env (SLACK_SIGNING_SECRET); when it's absent the Slack
 * endpoints stay disabled rather than accept unverified requests.
 */

export function hasSlackSigning(): boolean {
  return Boolean(process.env.SLACK_SIGNING_SECRET);
}

/**
 * Verify a Slack request. `rawBody` MUST be the exact bytes Slack sent (read via
 * req.text() before any parsing). Rejects requests older than 5 minutes to blunt
 * replay attacks, and compares signatures in constant time.
 */
export function verifySlackRequest(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false;

  const computed = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;

  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
