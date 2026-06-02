/**
 * Plain, dependency-free HTML email templates. Each builder returns a subject
 * and an HTML body wrapped in a consistent, email-client-safe shell.
 */

export type EmailContent = { subject: string; html: string };

const BRAND = "#0b2a4a";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell({
  workspace,
  heading,
  intro,
  rows,
  closing,
}: {
  workspace: string;
  heading: string;
  intro: string;
  rows: Array<{ label: string; value: string }>;
  closing: string;
}): string {
  const rowsHtml = rows
    .filter((row) => row.value)
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding:4px 4px 14px;color:${BRAND};font-size:15px;font-weight:700;letter-spacing:0.2px;">TicketOS</td>
      </tr>
      <tr>
        <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
          <h1 style="margin:0 0 10px;color:#0f172a;font-size:20px;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:22px;">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef2f7;border-bottom:1px solid #eef2f7;margin:0 0 18px;">
            ${rowsHtml}
          </table>
          <p style="margin:0;color:#475569;font-size:14px;line-height:22px;">${escapeHtml(closing)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 4px;color:#94a3b8;font-size:12px;">
          Sent by ${escapeHtml(workspace)} via TicketOS. If you weren't expecting this, contact your IT team.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function onboardingWelcomeEmail(input: {
  employeeName: string;
  workspace: string;
  startDate: string;
  managerEmail: string;
  apps: string;
}): EmailContent {
  const firstName = input.employeeName.split(/\s+/)[0] || input.employeeName;
  return {
    subject: `Welcome to ${input.workspace} — your onboarding is underway`,
    html: shell({
      workspace: input.workspace,
      heading: `Welcome aboard, ${firstName}!`,
      intro: `We're getting your accounts and access ready so you can hit the ground running. Here's what your IT team has set up for your first day.`,
      rows: [
        { label: "Start date", value: input.startDate },
        { label: "Apps & access", value: input.apps },
        { label: "Your manager", value: input.managerEmail },
      ],
      closing: `You'll receive sign-in details for each system separately. If anything is missing on day one, just reply to this email and your IT team will help.`,
    }),
  };
}

export function offboardingNoticeEmail(input: {
  employeeName: string;
  workspace: string;
  lastDay: string;
  managerEmail: string;
  apps: string;
}): EmailContent {
  const firstName = input.employeeName.split(/\s+/)[0] || input.employeeName;
  return {
    subject: `${input.workspace} — access wind-down for your departure`,
    html: shell({
      workspace: input.workspace,
      heading: `Offboarding checklist, ${firstName}`,
      intro: `Your IT team has started the offboarding process. Your access to company systems will be wound down around your last working day.`,
      rows: [
        { label: "Last working day", value: input.lastDay },
        { label: "Access affected", value: input.apps },
        { label: "Manager", value: input.managerEmail },
      ],
      closing: `Please save any personal files and return company devices before your last day. Questions about the process can go to your manager or IT team.`,
    }),
  };
}

export function passwordResetEmail(input: {
  employeeName: string;
  workspace: string;
  system: string;
  requiresApproval: boolean;
}): EmailContent {
  const firstName = input.employeeName.split(/\s+/)[0] || input.employeeName;
  return {
    subject: `${input.system} password reset requested`,
    html: shell({
      workspace: input.workspace,
      heading: `Password reset in progress`,
      intro: `Hi ${firstName}, a password reset for your ${input.system} account has been requested through your IT team.`,
      rows: [
        { label: "System", value: input.system },
        {
          label: "Status",
          value: input.requiresApproval
            ? "Pending approval — an admin will review shortly"
            : "Verified — reset is being processed",
        },
      ],
      closing: `You'll get sign-in instructions once the reset completes. If you did not request this, contact your IT team immediately.`,
    }),
  };
}
