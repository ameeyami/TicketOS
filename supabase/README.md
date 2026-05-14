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

## Apply

After linking the CLI to the hosted Supabase project, apply pending migrations with:

```bash
npx supabase db push
```

Local validation requires Docker/Supabase local services:

```bash
npx supabase db lint --local --fail-on error
```
