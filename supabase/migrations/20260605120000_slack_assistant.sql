-- Two-way Slack assistant: map a Slack workspace (team_id) to a TicketOS org so
-- slash commands and @-mentions resolve to the right org with NO user session.
-- The Slack signing secret + Supabase service-role key live only in the
-- deployment environment; this column is just the public workspace id. Re-runnable.

alter table public.organizations
  add column if not exists slack_team_id text;

create unique index if not exists organizations_slack_team_id_idx
  on public.organizations(slack_team_id)
  where slack_team_id is not null;
