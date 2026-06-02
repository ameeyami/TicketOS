import nodemailer from "nodemailer";

/**
 * Transactional email sender with two interchangeable backends:
 *
 *  1. Gmail SMTP  — set GMAIL_USER + GMAIL_APP_PASSWORD. Sends real email from
 *     your Gmail address (no custom domain needed). Create the app password at
 *     https://myaccount.google.com/apppasswords (requires 2-Step Verification).
 *
 *  2. Resend      — set RESEND_API_KEY + EMAIL_FROM. Requires a verified domain.
 *
 * Gmail is preferred when both are present. Email is best-effort: when nothing
 * is configured, sendEmail() returns { sent: false, reason: "not_configured" }
 * rather than throwing, so the ticket + audit trail always complete.
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
  via?: "gmail" | "resend";
};

function gmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function isEmailConfigured(): boolean {
  return gmailConfigured() || resendConfigured();
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((address) => address.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { sent: false, reason: "error", error: "No recipient address." };
  }

  if (gmailConfigured()) {
    return sendViaGmail(recipients, input);
  }

  if (resendConfigured()) {
    return sendViaResend(recipients, input);
  }

  return { sent: false, reason: "not_configured" };
}

async function sendViaGmail(recipients: string[], input: SendEmailInput): Promise<SendEmailResult> {
  const user = process.env.GMAIL_USER!;
  // Google generates app passwords with spaces (e.g. "abcd efgh ijkl mnop");
  // strip them so a copy-paste with spaces still works.
  const pass = process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "");
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "TicketOS";

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `${fromName} <${user}>`,
      to: recipients.join(", "),
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    return { sent: true, id: info.messageId, via: "gmail" };
  } catch (error) {
    return {
      sent: false,
      reason: "error",
      via: "gmail",
      error: error instanceof Error ? error.message : "Unknown Gmail SMTP error.",
    };
  }
}

async function sendViaResend(recipients: string[], input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.EMAIL_FROM!;

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
      return { sent: false, reason: "error", via: "resend", error: text.slice(0, 300) };
    }

    const data = (await response.json()) as { id?: string };
    return { sent: true, id: data.id, via: "resend" };
  } catch (error) {
    return {
      sent: false,
      reason: "error",
      via: "resend",
      error: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
}
