-- Fix: invited teammates landed in a brand-new personal org instead of the org
-- they were added to. Root cause: adding someone to a team writes a team_members
-- row keyed by EMAIL (user_id null, no organization_members row), but RLS only
-- lets existing org members read team_members — so a freshly-signed-up invitee
-- can neither see nor claim their own invite from the client.
--
-- This SECURITY DEFINER function lets an authenticated user claim any pending
-- team invitations addressed to their email: it joins them to the inviting org
-- and links their pending team_members rows to their user id. Safe to re-run.

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

  -- Earliest org this email was invited into and isn't a member of yet.
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

  -- Conservative org role: a viewer-only invite stays viewer; anything else
  -- becomes operator (can act on tickets, can't manage the org). An owner can
  -- promote them afterwards on the Team page.
  select case when bool_or(tm.role <> 'viewer') then 'operator'::public.member_role
              else 'viewer'::public.member_role end
    into v_role
  from public.team_members tm
  where tm.organization_id = v_org
    and lower(tm.member_email) = v_email;

  -- Carry over a display name from the invite if present.
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
