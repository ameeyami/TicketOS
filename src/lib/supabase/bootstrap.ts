import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_TEAMS } from "@/lib/teams";
import { workflowTemplates } from "@/lib/workflow-templates";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
};

export type DashboardTicket = {
  databaseId: string;
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  confidence: number;
  summary: string;
  agent: string;
};

export type DashboardAgent = {
  name: string;
  state: string;
  load: string;
  memory: string;
};

export type DashboardTimelineStep = {
  label: string;
  detail: string;
  status: string;
  time: string;
};

export type DashboardApproval = {
  id: string;
  ticketId: string;
  organizationId: string;
  title: string;
  description: string;
  status: string;
};

export type DashboardAuditRow = [string, string, string, string, string];

export type DashboardIntegration = {
  name: string;
  status: string;
};

export type DashboardData = {
  organizationName: string;
  filters: DashboardFilters;
  metrics: DashboardMetric[];
  tickets: DashboardTicket[];
  agents: DashboardAgent[];
  timeline: DashboardTimelineStep[];
  approval: DashboardApproval | null;
  integrations: DashboardIntegration[];
  auditRows: DashboardAuditRow[];
};

export type DashboardFilters = {
  query?: string;
  view?: string;
};

const demoAgents = [
  {
    name: "Access Agent",
    description: "Executes identity, password reset, and app-access workflows.",
    status: "Executing",
    capabilities: ["Okta", "Google Workspace", "Slack"],
    memory_scope: "Identity, Okta, Google Workspace",
  },
  {
    name: "Onboarding Agent",
    description: "Coordinates provisioning workflows for new employees.",
    status: "Waiting",
    capabilities: ["HRIS", "Slack", "Jira", "GitHub"],
    memory_scope: "HRIS, Slack, Jira, device policy",
  },
  {
    name: "Network Agent",
    description: "Investigates VPN and device-connectivity incidents.",
    status: "Investigating",
    capabilities: ["VPN", "Device posture", "Office gateways"],
    memory_scope: "VPN, device posture, office gateways",
  },
  {
    name: "Security Agent",
    description: "Handles deactivation, policy checks, and risky access escalations.",
    status: "Blocked",
    capabilities: ["Deactivation", "API keys", "Audit"],
    memory_scope: "Security policy, API keys, contractor access",
  },
];

const demoTickets = [
  {
    external_id: "TOS-1842",
    title: "Reset Okta password for Priya Shah",
    description: "Employee cannot access Okta after device replacement.",
    requester_email: "priya@example.com",
    requester_name: "Priya Shah",
    source: "slack",
    category: "Identity",
    priority: "high",
    status: "executing",
    ai_summary:
      "Identity verified through HRIS and Slack. Password reset workflow is executing with policy-compliant notification.",
    ai_confidence: 96,
    agentName: "Access Agent",
  },
  {
    external_id: "TOS-1838",
    title: "Provision Figma and GitHub for new designer",
    description: "New product designer needs access before onboarding call.",
    requester_email: "manager@example.com",
    requester_name: "Design Manager",
    source: "jira",
    category: "Onboarding",
    priority: "medium",
    status: "approval_required",
    ai_summary:
      "Matched onboarding workflow. GitHub access requires manager approval because repository scope includes production assets.",
    ai_confidence: 88,
    agentName: "Onboarding Agent",
  },
  {
    external_id: "TOS-1829",
    title: "VPN failure for Singapore sales team",
    description: "Several team members cannot connect to VPN gateway.",
    requester_email: "sales@example.com",
    requester_name: "Sales Ops",
    source: "teams",
    category: "Network",
    priority: "high",
    status: "triaging",
    ai_summary:
      "Detected regional gateway errors. Agent is collecting logs and preparing a routing workaround.",
    ai_confidence: 81,
    agentName: "Network Agent",
  },
  {
    external_id: "TOS-1821",
    title: "Deactivate contractor accounts",
    description: "Deactivate contractor access after project completion.",
    requester_email: "security@example.com",
    requester_name: "Security Ops",
    source: "manual",
    category: "Security",
    priority: "critical",
    status: "blocked",
    ai_summary:
      "Policy blocked autonomous deactivation because one account owns active production API keys.",
    ai_confidence: 64,
    agentName: "Security Agent",
  },
];

const integrationSeeds = [
  ["slack", "Slack"],
  ["teams", "Microsoft Teams"],
  ["okta", "Okta"],
  ["jira", "Jira"],
  ["google-workspace", "Google Workspace"],
  ["github", "GitHub"],
];

export async function getDashboardData(user: User, filters: DashboardFilters = {}): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const organization = await ensureWorkspace(supabase, user);
  await ensureDemoData(supabase, organization.id, user.id);

  const [
    { data: agents },
    { data: tickets },
    { data: approvalRequests },
    { data: integrations },
    { data: auditLogs },
    { data: latestRun },
  ] = await Promise.all([
    supabase.from("agents").select("*").eq("organization_id", organization.id).order("created_at"),
    supabase
      .from("tickets")
      .select("*, agents(name)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approval_requests")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("integrations").select("*").eq("organization_id", organization.id).order("display_name"),
    supabase
      .from("audit_logs")
      .select("*, agents(name)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("workflow_runs")
      .select("id")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: steps } = latestRun?.id
    ? await supabase
        .from("workflow_run_steps")
        .select("*")
        .eq("workflow_run_id", latestRun.id)
        .order("created_at")
    : { data: [] };

  const ticketRows = tickets ?? [];
  const agentRows = agents ?? [];
  const resolved = ticketRows.filter((ticket) => ticket.status === "resolved").length;
  const approvalCount = ticketRows.filter((ticket) => ticket.status === "approval_required").length;
  const confidenceAverage = ticketRows.length
    ? Math.round(
        ticketRows.reduce((sum, ticket) => sum + Number(ticket.ai_confidence ?? 0), 0) / ticketRows.length,
      )
    : 0;

  const filteredTickets = filterTickets(ticketRows, filters);

  return {
    organizationName: organization.name,
    filters,
    metrics: [
      {
        label: "AI resolved",
        value: ticketRows.length ? `${Math.round((resolved / ticketRows.length) * 100)}%` : "0%",
        delta: "live data",
      },
      { label: "Avg confidence", value: `${confidenceAverage}%`, delta: "agent read" },
      { label: "Tracked tickets", value: `${ticketRows.length}`, delta: "seeded queue" },
      { label: "Needs approval", value: `${approvalCount}`, delta: "pending" },
    ],
    tickets: filteredTickets.map((ticket) => ({
      databaseId: ticket.id,
      id: ticket.external_id ?? ticket.id.slice(0, 8),
      title: ticket.title,
      category: ticket.category ?? "Default",
      priority: titleCase(ticket.priority),
      status: displayTicketStatus(ticket.status),
      confidence: Number(ticket.ai_confidence ?? 0),
      summary: ticket.ai_summary ?? ticket.description ?? "",
      agent: ticket.agents?.name ?? "Unassigned",
    })),
    agents: agentRows.map((agent) => ({
      name: agent.name,
      state: agent.status,
      load: `${ticketRows.filter((ticket) => ticket.assigned_agent_id === agent.id).length} tasks`,
      memory: agent.memory_scope ?? agent.capabilities?.join(", ") ?? "General operations",
    })),
    timeline: (steps ?? []).map((step) => ({
      label: step.name,
      detail: step.output?.detail ?? step.error_message ?? "Execution step recorded in Supabase.",
      status: displayStepStatus(step.status),
      time: step.created_at ? new Date(step.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now",
    })),
    approval: approvalRequests?.[0]
      ? {
          id: approvalRequests[0].id,
          ticketId: approvalRequests[0].ticket_id,
          organizationId: approvalRequests[0].organization_id,
          title: approvalRequests[0].title,
          description: approvalRequests[0].description ?? "An AI workflow paused for human approval.",
          status: approvalRequests[0].status,
        }
      : null,
    integrations: (integrations ?? []).map((integration) => ({
      name: integration.display_name,
      status: titleCase(integration.status.replaceAll("_", " ")),
    })),
    auditRows: (auditLogs ?? []).map((log) => [
      log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now",
      log.agents?.name ?? "TicketOS",
      log.event_summary,
      titleCase(log.event_type.replaceAll("_", " ")),
      String(log.metadata?.policy ?? log.metadata?.source ?? "ticketos.live"),
    ]),
  };
}

function filterTickets<T extends { title: string; ai_summary: string | null; description: string | null; status: string; category: string | null; external_id: string | null }>(
  tickets: T[],
  filters: DashboardFilters,
) {
  let filtered = tickets;

  if (filters.view === "approvals") {
    filtered = filtered.filter((ticket) => ticket.status === "approval_required");
  }

  const query = filters.query?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((ticket) =>
      [
        ticket.title,
        ticket.ai_summary ?? "",
        ticket.description ?? "",
        ticket.category ?? "",
        ticket.external_id ?? "",
        ticket.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }

  return filtered;
}

// Older workspaces were created with this hardcoded name before the default
// was fixed. Self-heal it to the product brand on next load so emails and the
// app header stop showing the stale value. Safe + one-time: it only triggers
// on this exact legacy string, so any later rename in Settings sticks.
const LEGACY_DEFAULT_WORKSPACE_NAME = "Amee Labs";
const DEFAULT_WORKSPACE_BRAND = "TicketOS";

type OrgRow = { id: string; name: string; slug: string; created_by: string | null };

/**
 * Link any pending team invitations addressed to this user's email so an invited
 * teammate joins the org they were added to — instead of getting a brand-new
 * personal workspace on first login. Runs a SECURITY DEFINER RPC (it can cross
 * RLS safely and only ever acts on the caller's own email). Best-effort: returns
 * the joined org id, or null if there was nothing to claim / the migration isn't
 * applied yet.
 */
async function claimPendingInvites(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("claim_pending_team_invites");
    if (error) return null;
    return (data as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function ensureWorkspace(supabase: SupabaseClient, user: User) {
  // First, claim any invitations for this email (joins the inviting org).
  const claimedOrgId = await claimPendingInvites(supabase);

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organizations(id, name, slug, created_by)")
    .eq("user_id", user.id);

  const orgs = (memberships ?? [])
    .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
    .filter((o): o is OrgRow => Boolean(o));

  if (orgs.length > 0) {
    // Prefer the org we just claimed, then any org the user did NOT create (a
    // company workspace they were invited to), then a non-personal one, else the
    // first. This keeps invited members on the company org and off any stray
    // personal workspace created before this fix.
    const personalSlug = `ticketos-${user.id.slice(0, 8)}`;
    const org =
      orgs.find((o) => o.id === claimedOrgId) ??
      orgs.find((o) => o.created_by !== user.id) ??
      orgs.find((o) => o.slug !== personalSlug) ??
      orgs[0];

    let resolved: { id: string; name: string; slug: string } = {
      id: org.id,
      name: org.name,
      slug: org.slug,
    };

    if (org.name === LEGACY_DEFAULT_WORKSPACE_NAME) {
      const { error } = await supabase
        .from("organizations")
        .update({ name: DEFAULT_WORKSPACE_BRAND })
        .eq("id", org.id);
      if (!error) {
        resolved = { ...resolved, name: DEFAULT_WORKSPACE_BRAND };
      }
    }

    await ensureTeams(supabase, resolved, user);
    await ensureKnowledge(supabase, resolved, user);
    return resolved;
  }

  const fullName = readFullName(user);
  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
  });

  const slug = `ticketos-${user.id.slice(0, 8)}`;
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: deriveWorkspaceName(user),
      slug,
      created_by: user.id,
    })
    .select("id, name, slug")
    .single();

  if (orgError) {
    throw orgError;
  }

  const { error: membershipError } = await supabase.from("organization_members").insert({
    organization_id: organization.id,
    user_id: user.id,
    role: "owner",
  });

  if (membershipError) {
    throw membershipError;
  }

  await ensureTeams(supabase, organization, user);
  await ensureKnowledge(supabase, organization, user);
  return organization;
}

const STARTER_ARTICLES = [
  {
    title: "Reset your Okta password",
    category: "Identity",
    body: "1. Go to your company Okta sign-in page and choose 'Need help signing in?' then 'Forgot password'.\n2. Enter your work email and complete the verification (SMS, email, or authenticator).\n3. Set a new password that meets the policy (12+ chars, upper/lower, number, symbol).\nIf you're locked out or don't get the reset prompt, create a ticket and the Access Agent will verify your identity and reset it.",
  },
  {
    title: "Request access to an app",
    category: "Access",
    body: "Tell us which app (e.g. Slack, GitHub, Figma, Jira) and why you need it. Standard apps are provisioned automatically after manager approval; sensitive or admin access pauses for a security review. Most requests complete the same day. You can also raise this via your manager in the onboarding flow.",
  },
  {
    title: "Set up the company VPN",
    category: "Network",
    body: "1. Install the VPN client from the company software portal.\n2. Sign in with your SSO credentials.\n3. Choose the closest region and connect.\nIf the client won't connect, check you're on the latest version and your device is enrolled in MDM. Still stuck? Create a ticket and the Network Agent will investigate.",
  },
  {
    title: "Get a new laptop or device",
    category: "Hardware",
    body: "New hires get a device provisioned as part of onboarding. For replacements or upgrades, create a ticket with your role and preference (MacBook / Windows). Standard devices ship in 3-5 business days; your manager approves non-standard hardware.",
  },
];

// Seed a few starter knowledge articles so the self-service assistant works out
// of the box. Resilient: no-ops if the knowledge migration isn't applied yet.
async function ensureKnowledge(supabase: SupabaseClient, organization: { id: string }, user: User) {
  const { count, error } = await supabase
    .from("knowledge_articles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  if (error || (count ?? 0) > 0) {
    return;
  }

  await supabase.from("knowledge_articles").insert(
    STARTER_ARTICLES.map((article) => ({
      organization_id: organization.id,
      title: article.title,
      body: article.body,
      category: article.category,
      created_by: user.id,
    })),
  );
}

// Seed default teams + add the current user as their owner. Resilient: if the
// teams migration hasn't been applied yet, the count query errors and we no-op.
async function ensureTeams(supabase: SupabaseClient, organization: { id: string }, user: User) {
  const { count, error } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  if (error || (count ?? 0) > 0) {
    return;
  }

  const email = user.email ?? "";
  const memberName = readFullName(user) ?? email;

  for (const template of DEFAULT_TEAMS) {
    const { data: team } = await supabase
      .from("teams")
      .insert({
        organization_id: organization.id,
        name: template.name,
        slug: template.slug,
        description: template.description,
        color: template.color,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (!team) continue;
    await supabase.from("team_members").insert({
      team_id: team.id,
      organization_id: organization.id,
      user_id: user.id,
      member_email: email,
      member_name: memberName,
      role: "owner",
      added_by: user.id,
    });
  }
}

async function ensureDemoData(supabase: SupabaseClient, organizationId: string, userId: string) {
  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (count && count > 0) {
    return;
  }

  const { data: insertedAgents, error: agentsError } = await supabase
    .from("agents")
    .upsert(
      demoAgents.map((agent) => ({
        organization_id: organizationId,
        ...agent,
      })),
      { onConflict: "organization_id,name" },
    )
    .select("id, name");

  if (agentsError) {
    throw agentsError;
  }

  const agentByName = new Map((insertedAgents ?? []).map((agent) => [agent.name, agent.id]));

  const { data: insertedTickets, error: ticketsError } = await supabase
    .from("tickets")
    .upsert(
      demoTickets.map(({ agentName, ...ticket }) => ({
        organization_id: organizationId,
        ...ticket,
        assigned_agent_id: agentByName.get(agentName),
      })),
      { onConflict: "organization_id,external_id" },
    )
    .select("id, external_id, assigned_agent_id");

  if (ticketsError) {
    throw ticketsError;
  }

  await supabase.from("integrations").upsert(
    integrationSeeds.map(([provider_key, display_name]) => ({
      organization_id: organizationId,
      provider_key,
      display_name,
      status: "not_connected",
      scopes: ["read", "execute"],
      connected_by: null,
      connected_at: null,
    })),
    { onConflict: "organization_id,provider_key" },
  );

  const { data: workflow } = await supabase
    .from("workflows")
    .upsert(
      {
        organization_id: organizationId,
        name: "Identity password reset",
        description: "Verify identity, check policy, reset password, notify employee, and verify result.",
        trigger_type: "ticket_intent",
      },
      { onConflict: "organization_id,name" },
    )
    .select("id")
    .single();

  const { data: workflowVersion } = workflow
    ? await supabase
        .from("workflow_versions")
        .upsert(
          {
            organization_id: organizationId,
            workflow_id: workflow.id,
            version: 1,
            created_by: userId,
            graph: {
              nodes: ["intake", "analyze", "policy", "execute", "verify"],
              edges: ["intake->analyze", "analyze->policy", "policy->execute", "execute->verify"],
            },
          },
          { onConflict: "workflow_id,version" },
        )
        .select("id")
        .single()
    : { data: null };

  // Seed the rest of the workflow library so the Workflows page shows a real catalog.
  for (const [key, template] of Object.entries(workflowTemplates)) {
    if (key === "identity_password_reset") {
      continue;
    }
    const { data: libWorkflow } = await supabase
      .from("workflows")
      .upsert(
        {
          organization_id: organizationId,
          name: template.name,
          description: template.description,
          trigger_type: template.trigger_type,
        },
        { onConflict: "organization_id,name" },
      )
      .select("id")
      .single();

    if (libWorkflow) {
      await supabase.from("workflow_versions").upsert(
        {
          organization_id: organizationId,
          workflow_id: libWorkflow.id,
          version: 1,
          created_by: userId,
          graph: { ...template.graph, template: key },
        },
        { onConflict: "workflow_id,version" },
      );
    }
  }

  const passwordResetTicket = insertedTickets?.find((ticket) => ticket.external_id === "TOS-1842");
  const { data: run } =
    workflow && passwordResetTicket
      ? await supabase
          .from("workflow_runs")
          .insert({
            organization_id: organizationId,
            workflow_id: workflow.id,
            workflow_version_id: workflowVersion?.id,
            ticket_id: passwordResetTicket.id,
            status: "running",
            confidence: 96,
            replay_snapshot: { source: "demo_seed", replayable: true },
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single()
      : { data: null };

  if (run) {
    await supabase.from("workflow_run_steps").insert([
      step(organizationId, run.id, "received", "Request received", "succeeded", "Parsed Slack request and linked employee record."),
      step(organizationId, run.id, "analyzed", "Intent analyzed", "succeeded", "Classified as identity/password reset with 96% confidence."),
      step(organizationId, run.id, "permission", "Permission checked", "succeeded", "Confirmed requester, manager relationship, and Okta scope."),
      step(organizationId, run.id, "executing", "Workflow executing", "running", "Resetting password, rotating sessions, and preparing Slack notice."),
      step(organizationId, run.id, "verify", "Resolution verified", "pending", "Awaiting Okta confirmation event."),
    ]);

    await supabase.from("policy_evaluations").insert({
      organization_id: organizationId,
      workflow_run_id: run.id,
      ticket_id: passwordResetTicket?.id,
      decision: "allow",
      reason: "Requester identity and manager relationship passed policy checks.",
      confidence: 96,
      evaluated_context: { policy: "policy.identity.reset.v2" },
    });

    await supabase.from("execution_actions").insert([
      executionAction(
        organizationId,
        run.id,
        "okta",
        "reset_password",
        { user_id: "okta_priya_shah", notify_user: true },
        "Reset Okta password and rotated active sessions.",
      ),
      executionAction(
        organizationId,
        run.id,
        "google-workspace",
        "add_group_member",
        { group_email: "it-recovery@example.com", user_email: "priya@example.com" },
        "Re-added Priya to the it-recovery@example.com access group during recovery.",
      ),
      executionAction(
        organizationId,
        run.id,
        "slack",
        "send_ephemeral_message",
        { user_id: "U123PRIYA", message: "Your Okta password was reset. Sign in with the recovery link." },
        "Notified Priya in Slack that her password was reset.",
      ),
    ]);
  }

  const onboardingTicket = insertedTickets?.find((ticket) => ticket.external_id === "TOS-1838");
  await supabase.from("approval_requests").insert({
    organization_id: organizationId,
    ticket_id: onboardingTicket?.id,
    requested_by_agent_id: agentByName.get("Onboarding Agent"),
    title: "GitHub production repository access",
    description: "Onboarding Agent paused execution until manager approval is recorded.",
    status: "pending",
  });

  await supabase.from("audit_logs").insert([
    audit(organizationId, agentByName.get("Access Agent"), passwordResetTicket?.id, "allowed", "Okta password reset", "policy.identity.reset.v2"),
    audit(organizationId, null, passwordResetTicket?.id, "passed", "Manager relationship check", "hris.manager.match"),
    audit(organizationId, agentByName.get("Security Agent"), null, "blocked", "Contractor deactivation", "api_key.owner.active"),
    audit(organizationId, agentByName.get("Onboarding Agent"), onboardingTicket?.id, "approval", "GitHub team invite", "repo_scope.production"),
  ]);
}

function step(
  organizationId: string,
  workflowRunId: string,
  stepKey: string,
  name: string,
  status: string,
  detail: string,
) {
  return {
    organization_id: organizationId,
    workflow_run_id: workflowRunId,
    step_key: stepKey,
    name,
    status,
    actor_type: "agent",
    started_at: new Date().toISOString(),
    output: { detail },
  };
}

function executionAction(
  organizationId: string,
  workflowRunId: string,
  integrationKey: string,
  actionKey: string,
  requestPayload: Record<string, unknown>,
  detail: string,
) {
  return {
    organization_id: organizationId,
    workflow_run_id: workflowRunId,
    integration_key: integrationKey,
    action_key: actionKey,
    status: "succeeded",
    request_payload: requestPayload,
    response_payload: { detail, executed_at: new Date().toISOString() },
    idempotency_key: `seed-${workflowRunId}-${actionKey}`,
  };
}

function audit(
  organizationId: string,
  agentId: string | null | undefined,
  ticketId: string | null | undefined,
  eventType: string,
  summary: string,
  policy: string,
) {
  return {
    organization_id: organizationId,
    actor_agent_id: agentId,
    ticket_id: ticketId,
    event_type: eventType,
    event_summary: summary,
    metadata: { policy },
  };
}

function readFullName(user: User) {
  const metadata = user.user_metadata as { full_name?: string; name?: string };
  return metadata.full_name ?? metadata.name ?? user.email ?? "TicketOS Operator";
}

// Name the workspace after the user's company (email domain) when possible,
// otherwise after their first name — never a hardcoded value.
function deriveWorkspaceName(user: User) {
  const email = (user.email ?? "").toLowerCase();
  const sld = (email.split("@")[1] ?? "").split(".")[0] ?? "";
  const freeProviders = new Set([
    "gmail", "googlemail", "outlook", "hotmail", "yahoo", "icloud",
    "proton", "protonmail", "live", "aol", "me", "msn",
  ]);
  if (sld && !freeProviders.has(sld)) {
    return sld.charAt(0).toUpperCase() + sld.slice(1);
  }
  const metadata = user.user_metadata as { full_name?: string; name?: string };
  const first = (metadata.full_name ?? metadata.name ?? email.split("@")[0] ?? "My").trim().split(/\s+/)[0] || "My";
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}'s workspace`;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function displayTicketStatus(status: string) {
  const labels: Record<string, string> = {
    new: "New",
    triaging: "Investigating",
    approval_required: "Approval",
    executing: "Resolving",
    resolved: "Resolved",
    failed: "Failed",
    blocked: "Blocked",
  };

  return labels[status] ?? titleCase(status.replaceAll("_", " "));
}

function displayStepStatus(status: string) {
  if (status === "succeeded") return "complete";
  if (status === "running") return "active";
  if (status === "blocked") return "blocked";
  return "pending";
}
