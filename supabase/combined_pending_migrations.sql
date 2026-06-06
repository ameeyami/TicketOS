-- =============================================================================
-- TicketOS — combined pending migrations (one paste)
-- Run this in Supabase → SQL Editor. It is fully idempotent and wrapped in a
-- transaction: safe to run on a database that already has some of it, and if
-- anything fails nothing is applied. Covers:
--   1) Auto-knowledge        (knowledge_articles.status + source_ticket_id)
--   2) Public API + webhooks (api_keys table + organizations webhook columns)
--   3) Embeddable widget     (organizations.widget_key + widget_enabled)
--   4) Semantic KB search    (pgvector embedding column + match function)
--   5) Slack assistant       (organizations.slack_team_id for two-way Slack)
--   6) Team-invite claim     (claim_pending_team_invites so invitees join the org)
-- Prereqs already applied earlier this project: teams + knowledge base tables.
-- =============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Auto-knowledge: AI-drafted articles land as 'suggested' for review.
-- ----------------------------------------------------------------------------
alter table public.knowledge_articles
  add column if not exists status text not null default 'published',
  add column if not exists source_ticket_id uuid references public.tickets(id) on delete set null;

create index if not exists knowledge_articles_status_idx
  on public.knowledge_articles(organization_id, status);

-- ----------------------------------------------------------------------------
-- 2) Public API + webhooks: per-org API keys (hashed) + outbound webhook config.
-- ----------------------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'API key',
  key_hash text not null,
  last_four text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_org_idx on public.api_keys(organization_id);
create unique index if not exists api_keys_hash_idx on public.api_keys(key_hash);

alter table public.organizations
  add column if not exists webhook_url text,
  add column if not exists webhook_secret text,
  add column if not exists webhook_events text[] not null default '{ticket.created,ticket.resolved}';

alter table public.api_keys enable row level security;

drop policy if exists "Members read api keys" on public.api_keys;
create policy "Members read api keys" on public.api_keys
  for select to authenticated using (app_private.is_org_member(organization_id));

drop policy if exists "Admins manage api keys" on public.api_keys;
create policy "Admins manage api keys" on public.api_keys
  for all to authenticated
  using (app_private.is_org_admin(organization_id))
  with check (app_private.is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- 3) Embeddable self-service widget: public per-org widget key + on/off flag.
-- ----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists widget_key text,
  add column if not exists widget_enabled boolean not null default false;

create unique index if not exists organizations_widget_key_idx
  on public.organizations(widget_key)
  where widget_key is not null;

-- ----------------------------------------------------------------------------
-- 4) Semantic KB search: pgvector embeddings + cosine similarity match function.
-- ----------------------------------------------------------------------------
create extension if not exists vector;

alter table public.knowledge_articles
  add column if not exists embedding vector(1024);

create index if not exists knowledge_articles_embedding_idx
  on public.knowledge_articles using hnsw (embedding vector_cosine_ops);

create or replace function public.match_knowledge_articles(
  query_embedding vector(1024),
  match_org uuid,
  match_count int default 5
)
returns table (id uuid, title text, body text, category text, source_url text, similarity float)
language sql
stable
as $$
  select
    ka.id,
    ka.title,
    ka.body,
    ka.category,
    ka.source_url,
    1 - (ka.embedding <=> query_embedding) as similarity
  from public.knowledge_articles ka
  where ka.organization_id = match_org
    and ka.embedding is not null
    and (ka.status is null or ka.status = 'published')
  order by ka.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_knowledge_articles(vector, uuid, int) to authenticated;

-- ----------------------------------------------------------------------------
-- 5) Slack assistant: link a Slack workspace (team_id) to a TicketOS org so
--    slash commands and @-mentions resolve to the right org with no session.
-- ----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists slack_team_id text;

create unique index if not exists organizations_slack_team_id_idx
  on public.organizations(slack_team_id)
  where slack_team_id is not null;

-- ----------------------------------------------------------------------------
-- 6) Team-invite claim: let an authenticated user join the org they were added
--    to (by email) on first login, and link their pending team_members rows.
--    Fixes invitees landing in a brand-new personal org. SECURITY DEFINER so it
--    can cross RLS safely; only ever acts for the calling user's own email.
-- ----------------------------------------------------------------------------
create or replace function public.claim_pending_team_invites()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_org   uuid;
  v_role  public.member_role;
  v_name  text;
begin
  if v_uid is null or v_email = '' then
    return null;
  end if;

  select tm.organization_id
    into v_org
  from public.team_members tm
  where lower(tm.member_email) = v_email
    and not exists (
      select 1 from public.organization_members om
      where om.organization_id = tm.organization_id
        and om.user_id = v_uid
    )
  order by tm.created_at asc
  limit 1;

  if v_org is null then
    return null;
  end if;

  select case when bool_or(tm.role <> 'viewer') then 'operator'::public.member_role
              else 'viewer'::public.member_role end
    into v_role
  from public.team_members tm
  where tm.organization_id = v_org
    and lower(tm.member_email) = v_email;

  select tm.member_name
    into v_name
  from public.team_members tm
  where tm.organization_id = v_org
    and lower(tm.member_email) = v_email
    and tm.member_name is not null
  order by tm.created_at asc
  limit 1;

  insert into public.profiles (id, full_name)
  values (
    v_uid,
    coalesce(
      nullif((select auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
      nullif((select auth.jwt() -> 'user_metadata' ->> 'name'), ''),
      v_name,
      v_email
    )
  )
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org, v_uid, v_role)
  on conflict (organization_id, user_id) do nothing;

  update public.team_members
     set user_id = v_uid
   where organization_id = v_org
     and lower(member_email) = v_email
     and user_id is null;

  return v_org;
end;
$$;

grant execute on function public.claim_pending_team_invites() to authenticated;

commit;
