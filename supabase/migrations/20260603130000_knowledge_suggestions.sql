-- Auto-knowledge: AI-drafted articles land as 'suggested' for review before
-- they go live. Re-runnable (idempotent).

alter table public.knowledge_articles
  add column if not exists status text not null default 'published',
  add column if not exists source_ticket_id uuid references public.tickets(id) on delete set null;

create index if not exists knowledge_articles_status_idx on public.knowledge_articles(organization_id, status);
