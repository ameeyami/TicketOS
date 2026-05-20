create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ticket_comments_ticket_created_idx on public.ticket_comments(ticket_id, created_at desc);
create index ticket_comments_org_created_idx on public.ticket_comments(organization_id, created_at desc);

alter table public.ticket_comments enable row level security;

create policy "Members can read ticket comments" on public.ticket_comments
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "Members can create ticket comments" on public.ticket_comments
  for insert to authenticated
  with check (
    app_private.is_org_member(organization_id)
    and author_user_id = (select auth.uid())
  );
