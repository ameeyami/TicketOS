-- Embeddable self-service widget: a public per-org widget key + on/off flag.
-- The widget key only authorizes asking the published KB and raising a ticket;
-- it never exposes the org's Claude key or private data. Re-runnable.

alter table public.organizations
  add column if not exists widget_key text,
  add column if not exists widget_enabled boolean not null default false;

create unique index if not exists organizations_widget_key_idx
  on public.organizations(widget_key)
  where widget_key is not null;
