/**
 * Minimal transactional email sender built on Resend's HTTP API.
 *
 * No SDK dependency — we just POST to the REST endpoint with `fetch`.
 * Email is best-effort: if it isn't configured (no RESEND_API_KEY / EMAIL_FROM),
 * sendEmail() returns { sent: false, reason: "not_configured" } instead of
 * throwing, so the surrounding workflow (create the ticket, log the audit
 * trail) always completes.
 *
 * To enable real delivery, set two env vars (Vercel → Project → Settings →
 * Environment Variables):
 *   RESEND_API_KEY = re_********************
 *   EMAIL_FROM     = TicketOS <notifications@your-verified-domain.com>
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendEmailResult = {
  sent: boolean;
  id?: string;
  reason?: "not_configured" | "error";
  error?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((address) => address.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { sent: false, reason: "error", error: "No recipient address." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { sent: false, reason: "error", error: text.slice(0, 300) };
    }

    const data = (await response.json()) as { id?: string };
    return { sent: true, id: data.id };
  } catch (error) {
    return {
      sent: false,
      reason: "error",
      error: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
}
