-- 0006_colleague_ratings.sql
--
-- Voluntary "rate a colleague anytime" ratings. Separate from the Reality
-- Check peer_ratings which are tied to a specific round + invite token.
-- A rater can submit multiple times for the same (ratee, skill) pair —
-- the UI marks older entries as superseded (most recent = current).

create table if not exists public.colleague_ratings (
  id          uuid        primary key default gen_random_uuid(),
  rater_id    uuid        not null references public.users(id) on delete cascade,
  ratee_id    uuid        not null references public.users(id) on delete cascade,
  skill_id    uuid        not null references public.skills(id) on delete cascade,
  ratings     jsonb       not null,          -- { [dimensionId]: 1-5 }
  comments    text,
  created_at  timestamptz not null default now(),
  constraint no_self_rating check (rater_id <> ratee_id)
);

create index if not exists colleague_ratings_rater_idx on public.colleague_ratings(rater_id);
create index if not exists colleague_ratings_ratee_idx on public.colleague_ratings(ratee_id);
create index if not exists colleague_ratings_ratee_skill_idx on public.colleague_ratings(ratee_id, skill_id);

alter table public.colleague_ratings enable row level security;

-- Rater sees and manages their own submissions.
create policy colleague_ratings_rater_all on public.colleague_ratings
  for all
  using  (rater_id = auth.uid())
  with check (rater_id = auth.uid());

-- HR can read ratings within their org.
create policy colleague_ratings_hr_read on public.colleague_ratings
  for select
  using (
    public.user_role() = 'hr'
    and exists (
      select 1 from public.users u
      where u.id = colleague_ratings.ratee_id
        and u.org_id = public.user_org_id()
    )
  );

create policy colleague_ratings_super_admin on public.colleague_ratings
  for all using (public.user_role() = 'super_admin');
