-- Fix missing RLS policies for tables that have RLS enabled in 0001_init.sql
-- (Without explicit policies Postgres denies all access, causing "violates row-level security" errors.)

-- ── Groups ───────────────────────────────────────────────────────────────────
create policy groups_super_admin_all on public.groups
  for all using (public.user_role() = 'super_admin');

create policy groups_hr_same_org on public.groups
  for all
  using (public.user_role() = 'hr' and org_id = public.user_org_id())
  with check (public.user_role() = 'hr' and org_id = public.user_org_id());

create policy groups_participant_read_org on public.groups
  for select using (org_id = public.user_org_id());

-- ── Group members (junction) ─────────────────────────────────────────────────
create policy group_members_super_admin_all on public.group_members
  for all using (public.user_role() = 'super_admin');

create policy group_members_hr_same_org on public.group_members
  for all
  using (
    public.user_role() = 'hr'
    and exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.org_id = public.user_org_id()
    )
  )
  with check (
    public.user_role() = 'hr'
    and exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.org_id = public.user_org_id()
    )
  );

create policy group_members_participant_own on public.group_members
  for select using (user_id = auth.uid());

-- ── Org skills ───────────────────────────────────────────────────────────────
create policy org_skills_super_admin_all on public.org_skills
  for all using (public.user_role() = 'super_admin');

create policy org_skills_hr_same_org on public.org_skills
  for all
  using (public.user_role() = 'hr' and org_id = public.user_org_id())
  with check (public.user_role() = 'hr' and org_id = public.user_org_id());

create policy org_skills_participant_read_org on public.org_skills
  for select using (org_id = public.user_org_id());

-- ── Reality check rounds ─────────────────────────────────────────────────────
create policy rc_super_admin_all on public.reality_check_rounds
  for all using (public.user_role() = 'super_admin');

create policy rc_hr_same_org on public.reality_check_rounds
  for select using (
    public.user_role() = 'hr'
    and exists (
      select 1
      from public.user_skills us
      where us.id = reality_check_rounds.user_skill_id
        and us.org_id = public.user_org_id()
    )
  );

create policy rc_participant_own on public.reality_check_rounds
  for all using (
    exists (
      select 1
      from public.user_skills us
      where us.id = reality_check_rounds.user_skill_id
        and us.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_skills us
      where us.id = reality_check_rounds.user_skill_id
        and us.user_id = auth.uid()
    )
  );

-- ── Actions ──────────────────────────────────────────────────────────────────
create policy actions_super_admin_all on public.actions
  for all using (public.user_role() = 'super_admin');

create policy actions_hr_same_org on public.actions
  for select using (
    public.user_role() = 'hr'
    and exists (
      select 1
      from public.user_skills us
      where us.id = actions.user_skill_id
        and us.org_id = public.user_org_id()
    )
  );

create policy actions_participant_own on public.actions
  for all using (
    exists (
      select 1
      from public.user_skills us
      where us.id = actions.user_skill_id
        and us.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_skills us
      where us.id = actions.user_skill_id
        and us.user_id = auth.uid()
    )
  );

-- ── Peer invites ─────────────────────────────────────────────────────────────
create policy peer_invites_super_admin_all on public.peer_invites
  for all using (public.user_role() = 'super_admin');

create policy peer_invites_hr_same_org on public.peer_invites
  for select using (
    public.user_role() = 'hr'
    and exists (
      select 1
      from public.reality_check_rounds rc
      join public.user_skills us on us.id = rc.user_skill_id
      where rc.id = peer_invites.reality_check_id
        and us.org_id = public.user_org_id()
    )
  );

create policy peer_invites_participant_own on public.peer_invites
  for all using (
    exists (
      select 1
      from public.reality_check_rounds rc
      join public.user_skills us on us.id = rc.user_skill_id
      where rc.id = peer_invites.reality_check_id
        and us.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.reality_check_rounds rc
      join public.user_skills us on us.id = rc.user_skill_id
      where rc.id = peer_invites.reality_check_id
        and us.user_id = auth.uid()
    )
  );

-- ── Peer ratings ─────────────────────────────────────────────────────────────
create policy peer_ratings_super_admin_all on public.peer_ratings
  for all using (public.user_role() = 'super_admin');

create policy peer_ratings_hr_same_org on public.peer_ratings
  for select using (
    public.user_role() = 'hr'
    and exists (
      select 1
      from public.peer_invites pi
      join public.reality_check_rounds rc on rc.id = pi.reality_check_id
      join public.user_skills us on us.id = rc.user_skill_id
      where pi.id = peer_ratings.peer_invite_id
        and us.org_id = public.user_org_id()
    )
  );

create policy peer_ratings_participant_own on public.peer_ratings
  for all using (
    exists (
      select 1
      from public.peer_invites pi
      join public.reality_check_rounds rc on rc.id = pi.reality_check_id
      join public.user_skills us on us.id = rc.user_skill_id
      where pi.id = peer_ratings.peer_invite_id
        and us.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.peer_invites pi
      join public.reality_check_rounds rc on rc.id = pi.reality_check_id
      join public.user_skills us on us.id = rc.user_skill_id
      where pi.id = peer_ratings.peer_invite_id
        and us.user_id = auth.uid()
    )
  );

-- ── Agent intel ──────────────────────────────────────────────────────────────
create policy agent_intel_super_admin_all on public.agent_intel
  for all using (public.user_role() = 'super_admin');

create policy agent_intel_hr_same_org on public.agent_intel
  for select using (public.user_role() = 'hr' and org_id = public.user_org_id());

create policy agent_intel_participant_own on public.agent_intel
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Skill insights ───────────────────────────────────────────────────────────
create policy skill_insights_super_admin_all on public.skill_insights
  for all using (public.user_role() = 'super_admin');

create policy skill_insights_hr_same_org on public.skill_insights
  for select using (public.user_role() = 'hr' and org_id = public.user_org_id());

-- ── Feature flags ────────────────────────────────────────────────────────────
create policy feature_flags_super_admin_all on public.feature_flags
  for all using (public.user_role() = 'super_admin');

create policy feature_flags_hr_same_org on public.feature_flags
  for select using (public.user_role() = 'hr' and org_id = public.user_org_id());

