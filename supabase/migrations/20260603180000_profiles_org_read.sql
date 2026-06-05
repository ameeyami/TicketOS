-- Let org members read each other's profile name (so reports can show
-- "Created by" with a real name). Uses a SECURITY DEFINER helper so the policy
-- doesn't recurse through organization_members' own RLS. Re-runnable.

create or replace function app_private.shares_org(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members me
    join public.organization_members them
      on them.organization_id = me.organization_id
    where me.user_id = (select auth.uid())
      and them.user_id = target_user
  );
$$;

grant execute on function app_private.shares_org(uuid) to authenticated;

drop policy if exists "Org members can view colleague profiles" on public.profiles;
create policy "Org members can view colleague profiles" on public.profiles
  for select to authenticated
  using (app_private.shares_org(id));
