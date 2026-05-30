-- Harden jsonb-stored state into first-class columns.
--
-- Three TicketOS features currently persist state in jsonb / audit-log metadata
-- because the app cannot run DDL against the hosted DB at runtime:
--   1. Rollback lineage  -> execution_actions.request_payload / response_payload
--   2. Earned autonomy    -> audit_logs (event_type = 'workflow_autonomy_updated')
--   3. Monthly AI budget  -> audit_logs (event_type = 'cost_budget_updated')
--
-- This migration is ADDITIVE and BACKFILLS from the existing jsonb, so it is safe
-- to apply while the running app still reads the jsonb. It is also idempotent.
--
-- ROLLOUT (two steps, no downtime):
--   1. Apply this migration:  npx supabase db push   (or paste into the SQL editor)
--   2. Switch the runtime read/write paths to the new columns:
--        - src/app/app/executions/actions.ts (reverseExecutionAction): write/read
--          reverses_action_id / reversal_action_id / reversed_at / reversed_by columns
--        - src/lib/supabase/ticket-detail.ts + executions/page.tsx: read those columns
--        - src/app/app/costs/{page,actions}.ts: read/write organizations.monthly_ai_budget_usd
--        - src/app/app/autonomy/{page,actions}.ts + workflows/actions.ts: read/write
--          workflows.autonomy_level
--   Until step 2 ships, the columns simply mirror the jsonb (kept in sync by the backfill).

-- 1) Rollback lineage on execution_actions --------------------------------------
alter table public.execution_actions
  add column if not exists reverses_action_id uuid references public.execution_actions(id) on delete set null,
  add column if not exists reversal_action_id uuid references public.execution_actions(id) on delete set null,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid references auth.users(id) on delete set null;

create index if not exists execution_actions_reverses_idx
  on public.execution_actions(reverses_action_id);

-- A rollback action links to the action it reverses (stored in request_payload).
update public.execution_actions
set reverses_action_id = nullif(request_payload->>'reverses_action_id', '')::uuid
where reverses_action_id is null
  and request_payload ? 'reverses_action_id'
  and request_payload->>'reverses_action_id' ~* '^[0-9a-f-]{36}$';

-- A reversed action carries the reversal lineage (stored in response_payload).
update public.execution_actions
set reversed_at = nullif(response_payload->>'reversed_at', '')::timestamptz,
    reversed_by = case
      when response_payload->>'reversed_by' ~* '^[0-9a-f-]{36}$'
      then (response_payload->>'reversed_by')::uuid
    end,
    reversal_action_id = case
      when response_payload->>'reversal_action_id' ~* '^[0-9a-f-]{36}$'
      then (response_payload->>'reversal_action_id')::uuid
    end
where reversed_at is null
  and response_payload ? 'reversed_at';

-- 2) Per-workflow earned autonomy level -----------------------------------------
do $$
begin
  create type public.autonomy_level as enum ('suggest', 'approve_each', 'auto_with_audit', 'full_auto');
exception
  when duplicate_object then null;
end
$$;

alter table public.workflows
  add column if not exists autonomy_level public.autonomy_level not null default 'approve_each';

-- Backfill from the latest 'workflow_autonomy_updated' audit log per workflow.
update public.workflows w
set autonomy_level = sub.level::public.autonomy_level
from (
  select distinct on (metadata->>'workflow_id')
    (metadata->>'workflow_id')::uuid as workflow_id,
    metadata->>'level' as level
  from public.audit_logs
  where event_type = 'workflow_autonomy_updated'
    and metadata->>'workflow_id' ~* '^[0-9a-f-]{36}$'
    and metadata->>'level' in ('suggest', 'approve_each', 'auto_with_audit', 'full_auto')
  order by metadata->>'workflow_id', created_at desc
) sub
where w.id = sub.workflow_id;

-- 3) Org-level monthly AI budget ------------------------------------------------
alter table public.organizations
  add column if not exists monthly_ai_budget_usd numeric(12, 2);

-- Backfill from the latest 'cost_budget_updated' audit log per organization.
update public.organizations o
set monthly_ai_budget_usd = sub.budget::numeric
from (
  select distinct on (organization_id)
    organization_id,
    metadata->>'monthly_budget_usd' as budget
  from public.audit_logs
  where event_type = 'cost_budget_updated'
    and metadata ? 'monthly_budget_usd'
    and metadata->>'monthly_budget_usd' ~ '^[0-9]+(\.[0-9]+)?$'
  order by organization_id, created_at desc
) sub
where o.id = sub.organization_id
  and o.monthly_ai_budget_usd is null;
