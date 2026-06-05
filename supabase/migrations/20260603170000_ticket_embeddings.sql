-- Assisted resolution: embeddings for tickets kept in a SEPARATE table so the
-- heavy vector never lands in tickets.* selects. match_tickets returns the
-- closest RESOLVED tickets (which have known fixes) to a given query vector.
-- Re-runnable.

create extension if not exists vector;

create table if not exists public.ticket_embeddings (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  embedding vector(1024),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_embeddings_org_idx on public.ticket_embeddings(organization_id);
create index if not exists ticket_embeddings_vec_idx
  on public.ticket_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.ticket_embeddings enable row level security;

drop policy if exists "Members read ticket embeddings" on public.ticket_embeddings;
create policy "Members read ticket embeddings" on public.ticket_embeddings
  for select to authenticated using (app_private.is_org_member(organization_id));

drop policy if exists "Members write ticket embeddings" on public.ticket_embeddings;
create policy "Members write ticket embeddings" on public.ticket_embeddings
  for all to authenticated
  using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));

create or replace function public.match_tickets(
  query_embedding vector(1024),
  match_org uuid,
  exclude_ticket uuid,
  match_count int default 5
)
returns table (id uuid, external_id text, title text, ai_summary text, status text, resolved_at timestamptz, similarity float)
language sql
stable
as $$
  select
    t.id,
    t.external_id,
    t.title,
    t.ai_summary,
    t.status,
    t.resolved_at,
    1 - (te.embedding <=> query_embedding) as similarity
  from public.ticket_embeddings te
  join public.tickets t on t.id = te.ticket_id
  where te.organization_id = match_org
    and te.embedding is not null
    and t.id <> exclude_ticket
    and t.status = 'resolved'
  order by te.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_tickets(vector, uuid, uuid, int) to authenticated;
