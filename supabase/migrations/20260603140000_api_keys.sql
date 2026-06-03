-- Public API + webhooks: per-org API keys (stored hashed) and an outbound
-- webhook config on the organization. Re-runnable (idempotent).

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
