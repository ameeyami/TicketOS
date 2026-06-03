-- Knowledge base + self-service deflection log. Re-runnable (idempotent).

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text not null,
  category text,
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kb_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asked_by uuid references auth.users(id) on delete set null,
  question text not null,
  answer text,
  status text not null default 'answered', -- answered | resolved | escalated
  csat text,                                -- up | down | null
  source_article_ids uuid[] not null default '{}'::uuid[],
  ticket_id uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_articles_org_idx on public.knowledge_articles(organization_id);
create index if not exists kb_queries_org_idx on public.kb_queries(organization_id);

drop trigger if exists set_knowledge_articles_updated_at on public.knowledge_articles;
create trigger set_knowledge_articles_updated_at before update on public.knowledge_articles
  for each row execute function app_private.set_updated_at();

alter table public.knowledge_articles enable row level security;
alter table public.kb_queries enable row level security;

drop policy if exists "Members read knowledge" on public.knowledge_articles;
create policy "Members read knowledge" on public.knowledge_articles
  for select to authenticated using (app_private.is_org_member(organization_id));

drop policy if exists "Members manage knowledge" on public.knowledge_articles;
create policy "Members manage knowledge" on public.knowledge_articles
  for all to authenticated
  using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));

drop policy if exists "Members read kb queries" on public.kb_queries;
create policy "Members read kb queries" on public.kb_queries
  for select to authenticated using (app_private.is_org_member(organization_id));

drop policy if exists "Members insert kb queries" on public.kb_queries;
create policy "Members insert kb queries" on public.kb_queries
  for insert to authenticated with check (app_private.is_org_member(organization_id));

drop policy if exists "Members update kb queries" on public.kb_queries;
create policy "Members update kb queries" on public.kb_queries
  for update to authenticated
  using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));
