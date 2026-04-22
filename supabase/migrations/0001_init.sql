-- supabase/migrations/0001_init.sql
-- Nudgeable V1 — Full schema
-- Run: supabase db push

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type user_role    as enum ('super_admin', 'hr', 'participant');
create type user_status  as enum ('active', 'inactive', 'invited', 'suspended');
create type plan_tier    as enum ('starter', 'growth', 'enterprise');
create type skill_source as enum ('platform', 'org_custom');
create type action_status as enum ('pending', 'done', 'skipped');
create type invite_status as enum ('pending', 'submitted', 'expired');
create type phase        as enum ('pre', 'training', 'post');
create type email_event  as enum ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');

-- ── Helper: updated_at trigger ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Organizations ────────────────────────────────────────────────────────────
create table organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  logo_url        text,
  primary_contact text,
  region          text default 'us',
  plan            plan_tier default 'starter',
  seat_limit      int default 50,
  status          user_status default 'active',
  created_by      uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on organizations(status);
create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();

-- ── Users ────────────────────────────────────────────────────────────────────
create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  org_id          uuid references organizations(id) on delete cascade,
  role            user_role not null,
  email           text unique not null,
  name            text not null,
  plain_password  text,
  password_set_by uuid,
  must_change_pw  boolean default true,
  func            text,
  level           text,
  title           text,
  avatar_emoji    text,
  avatar_color    text,
  status          user_status default 'invited',
  joined_at       timestamptz default now(),
  last_active_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on users(org_id);
create index on users(role);
create index on users(email);
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- ── Groups ───────────────────────────────────────────────────────────────────
create table groups (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizations(id) on delete cascade,
  name           text not null,
  description    text,
  default_skills uuid[] default '{}',
  created_at     timestamptz default now()
);
create index on groups(org_id);

create table group_members (
  group_id   uuid references groups(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  added_at   timestamptz default now(),
  primary key (group_id, user_id)
);

-- ── Skills ───────────────────────────────────────────────────────────────────
create table skills (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  source      skill_source not null,
  name        text not null,
  icon        text,
  description text,
  dimensions  jsonb,
  is_archived boolean default false,
  created_by  uuid references users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index on skills(org_id);
create index on skills(source);
create trigger skills_updated_at before update on skills
  for each row execute function set_updated_at();

create table org_skills (
  org_id    uuid references organizations(id) on delete cascade,
  skill_id  uuid references skills(id) on delete cascade,
  enabled   boolean default true,
  added_at  timestamptz default now(),
  primary key (org_id, skill_id)
);

-- ── User Skills ──────────────────────────────────────────────────────────────
create table user_skills (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade,
  skill_id       uuid references skills(id) on delete cascade,
  org_id         uuid references organizations(id) on delete cascade,
  is_active      boolean default true,
  is_locked      boolean default false,
  baseline_peer  numeric(3,2),
  current_peer   numeric(3,2),
  peer_growth    numeric(3,2) generated always as (current_peer - baseline_peer) stored,
  self_avg       numeric(3,2),
  surveys_sent   int default 0,
  surveys_filled int default 0,
  rc_round       int default 0,
  phase          phase default 'pre',
  assigned_at    timestamptz default now(),
  unique (user_id, skill_id)
);
create index on user_skills(user_id);
create index on user_skills(skill_id);
create index on user_skills(org_id);

-- ── Reality Check Rounds ─────────────────────────────────────────────────────
create table reality_check_rounds (
  id              uuid primary key default gen_random_uuid(),
  user_skill_id   uuid references user_skills(id) on delete cascade,
  round_number    int not null,
  self_ratings    jsonb,
  self_comments   text,
  peer_aggregate  jsonb,
  peer_themes     jsonb,
  started_at      timestamptz default now(),
  closed_at       timestamptz,
  unique (user_skill_id, round_number)
);
create index on reality_check_rounds(user_skill_id);

-- ── Peer Invites ─────────────────────────────────────────────────────────────
create table peer_invites (
  id               uuid primary key default gen_random_uuid(),
  reality_check_id uuid references reality_check_rounds(id) on delete cascade,
  peer_email       text not null,
  peer_relation    text,
  token            text unique not null default encode(gen_random_bytes(32), 'hex'),
  status           invite_status default 'pending',
  sent_at          timestamptz default now(),
  submitted_at     timestamptz,
  reminder_count   int default 0
);
create index on peer_invites(reality_check_id);
create index on peer_invites(token);

-- ── Peer Ratings ─────────────────────────────────────────────────────────────
create table peer_ratings (
  id              uuid primary key default gen_random_uuid(),
  peer_invite_id  uuid references peer_invites(id) on delete cascade unique,
  ratings         jsonb not null,
  comments        text,
  submitted_at    timestamptz default now()
);

-- ── Actions ──────────────────────────────────────────────────────────────────
create table actions (
  id            uuid primary key default gen_random_uuid(),
  user_skill_id uuid references user_skills(id) on delete cascade,
  title         text not null,
  what          text,
  why           text,
  how           text,
  difficulty    int check (difficulty between 1 and 5),
  effort_days   int,
  status        action_status default 'pending',
  due_date      date,
  done_at       timestamptz,
  notes         text,
  position      int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on actions(user_skill_id, status);
create trigger actions_updated_at before update on actions
  for each row execute function set_updated_at();

-- ── Conversations & Messages ──────────────────────────────────────────────────
create table conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  user_skill_id uuid references user_skills(id) on delete cascade,
  phase         phase default 'pre',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on conversations(user_id, user_skill_id);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  tokens_used     int,
  created_at      timestamptz default now()
);
create index on messages(conversation_id, created_at);

-- ── Agent Intel ───────────────────────────────────────────────────────────────
create table agent_intel (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade,
  skill_id       uuid references skills(id) on delete cascade,
  org_id         uuid references organizations(id) on delete cascade,
  current_level  text,
  context        text,
  motivations    text[],
  blockers       text[],
  raw_summary    text,
  updated_at     timestamptz default now(),
  unique (user_id, skill_id)
);

-- ── Skill Insights ─────────────────────────────────────────────────────────────
create table skill_insights (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid references organizations(id) on delete cascade,
  skill_id               uuid references skills(id) on delete cascade,
  avg_peer_score         numeric(3,2),
  top_scorers            jsonb,
  top_growers            jsonb,
  volume                 int default 0,
  unique_askers          int default 0,
  unique_convos          int default 0,
  summary                text,
  top_themes             jsonb,
  sample_qs              jsonb,
  recommended_hr_action  text,
  generated_at           timestamptz default now(),
  unique (org_id, skill_id, generated_at)
);
create index on skill_insights(org_id, skill_id, generated_at desc);

-- ── Audit Log ────────────────────────────────────────────────────────────────
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id),
  actor_id    uuid references users(id),
  actor_role  user_role,
  action      text not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz default now()
);
create index on audit_log(org_id, created_at desc);
create index on audit_log(actor_id, created_at desc);

-- ── Email Log ────────────────────────────────────────────────────────────────
create table email_log (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizations(id),
  to_email         text not null,
  subject          text,
  template         text,
  payload          jsonb,
  sendgrid_msg_id  text,
  status           email_event default 'queued',
  error_message    text,
  sent_at          timestamptz default now(),
  last_event_at    timestamptz
);
create index on email_log(to_email);
create index on email_log(sendgrid_msg_id);

-- ── Feature Flags ────────────────────────────────────────────────────────────
create table feature_flags (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  key        text not null,
  enabled    boolean default false,
  value      jsonb,
  updated_at timestamptz default now(),
  unique (org_id, key)
);

-- ── LLM Usage ────────────────────────────────────────────────────────────────
create table llm_usage (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  user_id     uuid references users(id),
  model       text,
  tokens_in   int,
  tokens_out  int,
  cost_cents  numeric(12,4),
  feature     text,
  created_at  timestamptz default now()
);
create index on llm_usage(org_id, created_at desc);

-- ── RLS: Enable on all tables ────────────────────────────────────────────────
alter table organizations       enable row level security;
alter table users               enable row level security;
alter table groups              enable row level security;
alter table group_members       enable row level security;
alter table skills              enable row level security;
alter table org_skills          enable row level security;
alter table user_skills         enable row level security;
alter table reality_check_rounds enable row level security;
alter table peer_invites        enable row level security;
alter table peer_ratings        enable row level security;
alter table actions             enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table agent_intel         enable row level security;
alter table skill_insights      enable row level security;
alter table audit_log           enable row level security;
alter table email_log           enable row level security;
alter table feature_flags       enable row level security;
alter table llm_usage           enable row level security;

-- ── RLS Helper functions ─────────────────────────────────────────────────────
create or replace function public.user_org_id() returns uuid language sql stable security definer as $$
  select org_id from public.users where id = auth.uid();
$$;

create or replace function public.user_role() returns user_role language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

-- ── RLS Policies: users ──────────────────────────────────────────────────────
create policy users_super_admin_all on users
  for all using (public.user_role() = 'super_admin');

create policy users_hr_same_org on users
  for all using (public.user_role() = 'hr' and org_id = public.user_org_id());

create policy users_participant_self_select on users
  for select using (id = auth.uid());

create policy users_participant_self_update on users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── RLS Policies: organizations ──────────────────────────────────────────────
create policy orgs_super_admin_all on organizations
  for all using (public.user_role() = 'super_admin');

create policy orgs_hr_own on organizations
  for select using (public.user_role() = 'hr' and id = public.user_org_id());

-- ── RLS Policies: user_skills ────────────────────────────────────────────────
create policy us_super_admin on user_skills for all using (public.user_role() = 'super_admin');
create policy us_hr_same_org on user_skills for all using (public.user_role() = 'hr' and org_id = public.user_org_id());
create policy us_participant_own on user_skills for all using (user_id = auth.uid());

-- ── RLS Policies: conversations + messages ───────────────────────────────────
create policy conv_super_admin on conversations for all using (public.user_role() = 'super_admin');
create policy conv_participant_own on conversations for all using (user_id = auth.uid());

create policy msg_own on messages for all using (
  exists (select 1 from conversations where id = conversation_id and user_id = auth.uid())
);
create policy msg_super_admin on messages for all using (public.user_role() = 'super_admin');

-- ── RLS Policies: skills (platform = public read) ───────────────────────────
create policy skills_platform_read on skills
  for select using (source = 'platform' or org_id = public.user_org_id() or public.user_role() = 'super_admin');

create policy skills_super_admin_write on skills
  for all using (public.user_role() = 'super_admin');

create policy skills_hr_org_write on skills
  for all using (public.user_role() = 'hr' and org_id = public.user_org_id());

-- ── RLS: audit/email/llm — super_admin + hr read ─────────────────────────────
create policy audit_super_admin on audit_log for all using (public.user_role() = 'super_admin');
create policy audit_hr_own on audit_log for select using (public.user_role() = 'hr' and org_id = public.user_org_id());

create policy email_super_admin on email_log for all using (public.user_role() = 'super_admin');
create policy email_hr_own on email_log for select using (public.user_role() = 'hr' and org_id = public.user_org_id());

create policy llm_super_admin on llm_usage for all using (public.user_role() = 'super_admin');
create policy llm_hr_own on llm_usage for select using (public.user_role() = 'hr' and org_id = public.user_org_id());
