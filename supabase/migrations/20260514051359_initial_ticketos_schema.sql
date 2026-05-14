create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;

create type public.member_role as enum ('owner', 'admin', 'operator', 'viewer');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');
create type public.ticket_status as enum ('new', 'triaging', 'approval_required', 'executing', 'resolved', 'failed', 'blocked');
create type public.execution_status as enum ('queued', 'running', 'waiting_for_approval', 'succeeded', 'failed', 'blocked', 'cancelled');
create type public.step_status as enum ('pending', 'running', 'succeeded', 'failed', 'skipped', 'blocked');
create type public.policy_decision as enum ('allow', 'approval_required', 'block');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.integration_status as enum ('not_connected', 'connected', 'degraded', 'disabled');

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'operator',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create or replace function app_private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
  );
$$;

create or replace function app_private.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner', 'admin')
  );
$$;

create or replace function app_private.created_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = target_organization_id
      and o.created_by = (select auth.uid())
  );
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.is_org_member(uuid) to authenticated;
grant execute on function app_private.is_org_admin(uuid) to authenticated;
grant execute on function app_private.created_org(uuid) to authenticated;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text,
  title text not null,
  description text,
  requester_email text,
  requester_name text,
  source text not null default 'manual',
  category text,
  priority public.ticket_priority not null default 'medium',
  status public.ticket_status not null default 'new',
  ai_summary text,
  ai_confidence numeric(5,2) not null default 0 check (ai_confidence >= 0 and ai_confidence <= 100),
  assigned_agent_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  capabilities text[] not null default '{}',
  memory_scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.tickets
  add constraint tickets_assigned_agent_fk
  foreign key (assigned_agent_id) references public.agents(id) on delete set null;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  status public.execution_status not null default 'queued',
  model text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  version integer not null,
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workflow_id, version)
);

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id uuid references public.workflows(id) on delete set null,
  workflow_version_id uuid references public.workflow_versions(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete cascade,
  status public.execution_status not null default 'queued',
  confidence numeric(5,2) not null default 0 check (confidence >= 0 and confidence <= 100),
  replay_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_key text not null,
  name text not null,
  status public.step_status not null default 'pending',
  actor_type text not null default 'agent',
  started_at timestamptz,
  completed_at timestamptz,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  unique (workflow_run_id, step_key)
);

create table public.execution_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  workflow_run_step_id uuid references public.workflow_run_steps(id) on delete cascade,
  integration_key text not null,
  action_key text not null,
  status public.step_status not null default 'pending',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create table public.policy_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  action_pattern text not null,
  decision public.policy_decision not null,
  conditions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.policy_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  policy_rule_id uuid references public.policy_rules(id) on delete set null,
  decision public.policy_decision not null,
  reason text not null,
  confidence numeric(5,2) not null default 0 check (confidence >= 0 and confidence <= 100),
  evaluated_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  requested_by_agent_id uuid references public.agents(id) on delete set null,
  approver_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status public.approval_status not null default 'pending',
  due_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_key text not null,
  display_name text not null,
  status public.integration_status not null default 'not_connected',
  scopes text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_key)
);

create table public.integration_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  action_key text not null,
  display_name text not null,
  risk_level text not null default 'low',
  requires_approval boolean not null default false,
  schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, action_key)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_agent_id uuid references public.agents(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  event_type text not null,
  event_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.copilot_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null references public.copilot_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end)
);

create index organization_members_user_idx on public.organization_members(user_id);
create index tickets_org_status_priority_idx on public.tickets(organization_id, status, priority, created_at desc);
create index tickets_org_external_id_idx on public.tickets(organization_id, external_id);
create index agent_runs_org_ticket_idx on public.agent_runs(organization_id, ticket_id, created_at desc);
create index workflow_runs_org_ticket_idx on public.workflow_runs(organization_id, ticket_id, created_at desc);
create index workflow_run_steps_run_idx on public.workflow_run_steps(workflow_run_id, created_at);
create index execution_actions_run_idx on public.execution_actions(workflow_run_id, created_at);
create index policy_evaluations_run_idx on public.policy_evaluations(workflow_run_id, created_at);
create index approval_requests_org_status_idx on public.approval_requests(organization_id, status, created_at desc);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index copilot_messages_thread_idx on public.copilot_messages(thread_id, created_at);
create index analytics_snapshots_org_period_idx on public.analytics_snapshots(organization_id, period_start desc);

create trigger set_organizations_updated_at before update on public.organizations
  for each row execute function app_private.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function app_private.set_updated_at();
create trigger set_organization_members_updated_at before update on public.organization_members
  for each row execute function app_private.set_updated_at();
create trigger set_tickets_updated_at before update on public.tickets
  for each row execute function app_private.set_updated_at();
create trigger set_agents_updated_at before update on public.agents
  for each row execute function app_private.set_updated_at();
create trigger set_workflows_updated_at before update on public.workflows
  for each row execute function app_private.set_updated_at();
create trigger set_workflow_runs_updated_at before update on public.workflow_runs
  for each row execute function app_private.set_updated_at();
create trigger set_policy_rules_updated_at before update on public.policy_rules
  for each row execute function app_private.set_updated_at();
create trigger set_approval_requests_updated_at before update on public.approval_requests
  for each row execute function app_private.set_updated_at();
create trigger set_integrations_updated_at before update on public.integrations
  for each row execute function app_private.set_updated_at();
create trigger set_integration_actions_updated_at before update on public.integration_actions
  for each row execute function app_private.set_updated_at();
create trigger set_copilot_threads_updated_at before update on public.copilot_threads
  for each row execute function app_private.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.tickets enable row level security;
alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_versions enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_run_steps enable row level security;
alter table public.execution_actions enable row level security;
alter table public.policy_rules enable row level security;
alter table public.policy_evaluations enable row level security;
alter table public.approval_requests enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_actions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.copilot_threads enable row level security;
alter table public.copilot_messages enable row level security;
alter table public.analytics_snapshots enable row level security;

create policy "Members can view their organizations" on public.organizations
  for select to authenticated
  using (created_by = (select auth.uid()) or app_private.is_org_member(id));

create policy "Authenticated users can create organizations" on public.organizations
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Organization admins can update organizations" on public.organizations
  for update to authenticated
  using (app_private.is_org_admin(id))
  with check (app_private.is_org_admin(id));

create policy "Users can view their profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can insert their profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "Users can update their profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Members can view organization memberships" on public.organization_members
  for select to authenticated
  using (app_private.is_org_member(organization_id) or app_private.created_org(organization_id));

create policy "Creators can add their first membership" on public.organization_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and app_private.created_org(organization_id)
  );

create policy "Admins can manage memberships" on public.organization_members
  for update to authenticated
  using (app_private.is_org_admin(organization_id))
  with check (app_private.is_org_admin(organization_id));

create policy "Admins can remove memberships" on public.organization_members
  for delete to authenticated
  using (app_private.is_org_admin(organization_id));

create policy "Members can read org rows" on public.tickets
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create tickets" on public.tickets
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Operators can update tickets" on public.tickets
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy "Members can read agents" on public.agents
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Admins can manage agents" on public.agents
  for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

create policy "Members can read agent runs" on public.agent_runs
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create agent runs" on public.agent_runs
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Operators can update agent runs" on public.agent_runs
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy "Members can read workflows" on public.workflows
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Admins can manage workflows" on public.workflows
  for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

create policy "Members can read workflow versions" on public.workflow_versions
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Admins can manage workflow versions" on public.workflow_versions
  for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

create policy "Members can read workflow runs" on public.workflow_runs
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create workflow runs" on public.workflow_runs
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Operators can update workflow runs" on public.workflow_runs
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy "Members can read workflow run steps" on public.workflow_run_steps
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create workflow run steps" on public.workflow_run_steps
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Operators can update workflow run steps" on public.workflow_run_steps
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy "Members can read execution actions" on public.execution_actions
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create execution actions" on public.execution_actions
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Operators can update execution actions" on public.execution_actions
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy "Members can read policy rules" on public.policy_rules
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Admins can manage policy rules" on public.policy_rules
  for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

create policy "Members can read policy evaluations" on public.policy_evaluations
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create policy evaluations" on public.policy_evaluations
  for insert to authenticated with check (app_private.is_org_member(organization_id));

create policy "Members can read approval requests" on public.approval_requests
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create approval requests" on public.approval_requests
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Members can decide assigned approval requests" on public.approval_requests
  for update to authenticated
  using (app_private.is_org_member(organization_id) and (approver_user_id is null or approver_user_id = (select auth.uid()) or app_private.is_org_admin(organization_id)))
  with check (app_private.is_org_member(organization_id));

create policy "Members can read integrations" on public.integrations
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Admins can manage integrations" on public.integrations
  for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

create policy "Members can read integration actions" on public.integration_actions
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Admins can manage integration actions" on public.integration_actions
  for all to authenticated using (app_private.is_org_admin(organization_id)) with check (app_private.is_org_admin(organization_id));

create policy "Members can read audit logs" on public.audit_logs
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create audit logs" on public.audit_logs
  for insert to authenticated with check (app_private.is_org_member(organization_id));

create policy "Members can read copilot threads" on public.copilot_threads
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Members can create copilot threads" on public.copilot_threads
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy "Thread creators and admins can update copilot threads" on public.copilot_threads
  for update to authenticated
  using (app_private.is_org_member(organization_id) and (created_by = (select auth.uid()) or app_private.is_org_admin(organization_id)))
  with check (app_private.is_org_member(organization_id));

create policy "Members can read copilot messages" on public.copilot_messages
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Members can create copilot messages" on public.copilot_messages
  for insert to authenticated with check (app_private.is_org_member(organization_id));

create policy "Members can read analytics snapshots" on public.analytics_snapshots
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy "Operators can create analytics snapshots" on public.analytics_snapshots
  for insert to authenticated with check (app_private.is_org_member(organization_id));
