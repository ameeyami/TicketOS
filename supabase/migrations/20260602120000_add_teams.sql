-- Teams: a layer inside a workspace. Members are scoped to teams, and tickets
-- record which team raised them and which team processes them.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  member_email text not null,
  member_name text,
  role public.member_role not null default 'operator',
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, member_email)
);

alter table public.tickets
  add column if not exists requesting_team_id uuid references public.teams(id) on delete set null,
  add column if not exists assigned_team_id uuid references public.teams(id) on delete set null;

create index if not exists teams_org_idx on public.teams(organization_id);
create index if not exists team_members_team_idx on public.team_members(team_id);
create index if not exists team_members_org_idx on public.team_members(organization_id);
create index if not exists team_members_email_idx on public.team_members(lower(member_email));
create index if not exists tickets_requesting_team_idx on public.tickets(requesting_team_id);
create index if not exists tickets_assigned_team_idx on public.tickets(assigned_team_id);

create trigger set_teams_updated_at before update on public.teams
  for each row execute function app_private.set_updated_at();

-- Can the current user manage a given team? (org admins, or the team creator)
create or replace function app_private.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = target_team_id
      and (
        app_private.is_org_admin(t.organization_id)
        or t.created_by = (select auth.uid())
      )
  );
$$;

grant execute on function app_private.can_manage_team(uuid) to authenticated;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Members can view teams" on public.teams
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "Members can create teams" on public.teams
  for insert to authenticated
  with check (app_private.is_org_member(organization_id) and created_by = (select auth.uid()));

create policy "Managers can update teams" on public.teams
  for update to authenticated
  using (app_private.is_org_admin(organization_id) or created_by = (select auth.uid()))
  with check (app_private.is_org_admin(organization_id) or created_by = (select auth.uid()));

create policy "Managers can delete teams" on public.teams
  for delete to authenticated
  using (app_private.is_org_admin(organization_id) or created_by = (select auth.uid()));

create policy "Members can view team members" on public.team_members
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "Managers can add team members" on public.team_members
  for insert to authenticated
  with check (app_private.can_manage_team(team_id));

create policy "Managers can update team members" on public.team_members
  for update to authenticated
  using (app_private.can_manage_team(team_id))
  with check (app_private.can_manage_team(team_id));

create policy "Managers can remove team members" on public.team_members
  for delete to authenticated
  using (app_private.can_manage_team(team_id));
