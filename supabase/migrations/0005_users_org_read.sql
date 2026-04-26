-- 0005_users_org_read.sql
--
-- Participants currently can only SELECT their own users row (users_participant_self_select).
-- The peer-picker at /api/org/peers needs to list all active colleagues in the same org.
-- Add a read-only policy scoped to same org + active status.

create policy users_participant_read_org on public.users
  for select
  using (
    org_id = public.user_org_id()
    and status <> 'inactive'
  );
