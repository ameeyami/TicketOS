# TicketOS Supabase Schema

This folder contains the versioned Supabase database foundation for TicketOS.

## Initial Migration

`migrations/20260514051359_initial_ticketos_schema.sql` creates the Phase 1 operational data model:

- Organizations, profiles, memberships, and roles
- Tickets and AI summaries
- Agents and agent runs
- Workflows, workflow versions, workflow runs, and run steps
- Execution actions and replay snapshots
- Policy rules and evaluations
- Approval requests
- Integrations and integration actions
- Audit logs
- Copilot threads/messages
- Analytics snapshots

All public tables have Row Level Security enabled. Tenant access is gated through organization membership helper functions in the private `app_private` schema.

## Hardening migration

`migrations/20260530120000_harden_jsonb_to_columns.sql` promotes feature state that the app currently keeps in jsonb / audit-log metadata into first-class columns:

- Rollback lineage on `execution_actions` (`reverses_action_id`, `reversal_action_id`, `reversed_at`, `reversed_by`)
- A per-workflow `workflows.autonomy_level` (enum)
- An org-level `organizations.monthly_ai_budget_usd`

It is additive and backfills from the existing data, so it is safe to apply while the app is running. After applying, switch the runtime read/write paths to the new columns — see the rollout note at the top of the migration file.

## Apply

After linking the CLI to the hosted Supabase project, apply pending migrations with:

```bash
npx supabase db push
```

Local validation requires Docker/Supabase local services:

```bash
npx supabase db lint --local --fail-on error
```
