/**
 * Minimal real Jira Cloud REST client (no SDK). Credentials via env:
 *   JIRA_BASE_URL    = https://your-domain.atlassian.net
 *   JIRA_EMAIL       = you@company.com
 *   JIRA_API_TOKEN   = (from id.atlassian.com/manage-profile/security/api-tokens)
 *   JIRA_PROJECT_KEY = e.g. OPS
 *
 * Creates an issue (execute) and deletes it (rollback) — a clean reversible pair.
 */

export function isJiraConfigured(): boolean {
  return Boolean(
    process.env.JIRA_BASE_URL &&
      process.env.JIRA_EMAIL &&
      process.env.JIRA_API_TOKEN &&
      process.env.JIRA_PROJECT_KEY,
  );
}

function authHeader(): string {
  const basic = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64");
  return `Basic ${basic}`;
}

// Jira Cloud API v3 needs the description in Atlassian Document Format.
function toAdf(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export type JiraCreateResult =
  | { ok: true; key: string; id: string; url: string }
  | { ok: false; error: string };

export async function jiraCreateIssue(summary: string, description?: string): Promise<JiraCreateResult> {
  if (!isJiraConfigured()) {
    return { ok: false, error: "not_configured" };
  }
  const base = process.env.JIRA_BASE_URL!.replace(/\/+$/, "");

  try {
    const response = await fetch(`${base}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: process.env.JIRA_PROJECT_KEY },
          summary: summary.slice(0, 250),
          issuetype: { name: "Task" },
          ...(description ? { description: toAdf(description) } : {}),
        },
      }),
    });
    const data = (await response.json()) as { key?: string; id?: string; errors?: unknown; errorMessages?: string[] };
    if (!response.ok || !data.key || !data.id) {
      const detail = data.errorMessages?.join("; ") || JSON.stringify(data.errors ?? data).slice(0, 200);
      return { ok: false, error: detail || `status ${response.status}` };
    }
    return { ok: true, key: data.key, id: data.id, url: `${base}/browse/${data.key}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "request_failed" };
  }
}

export type JiraDeleteResult = { ok: true } | { ok: false; error: string };

export async function jiraDeleteIssue(key: string): Promise<JiraDeleteResult> {
  if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
    return { ok: false, error: "not_configured" };
  }
  const base = process.env.JIRA_BASE_URL.replace(/\/+$/, "");

  try {
    const response = await fetch(`${base}/rest/api/3/issue/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { Authorization: authHeader() },
    });
    return response.ok || response.status === 204 ? { ok: true } : { ok: false, error: `status ${response.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "request_failed" };
  }
}
