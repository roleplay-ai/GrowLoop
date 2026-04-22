# Nudgeable SaaS — Full Database Schema (V1)

**Stack:** Next.js (App Router) · Supabase (Postgres + Auth) · SendGrid
**Auth model:** Supabase Auth handles hashed passwords + sessions. A custom `users` profile table stores role, org, plain-text password, and all domain fields.
**Password storage:** `plain_password TEXT` stored literally in `users` (per explicit requirement so HR can re-send credentials).
**Multi-tenancy:** every domain row carries `org_id`. Row-level security (RLS) enforces isolation.

---

## 0. Roles enum

```sql
create type user_role as enum ('super_admin', 'hr', 'participant');
create type user_status as enum ('active', 'inactive', 'invited', 'suspended');
create type plan_tier as enum ('starter', 'growth', 'enterprise');
create type skill_source as enum ('platform', 'org_custom');
create type action_status as enum ('pending', 'done', 'skipped');
create type invite_status as enum ('pending', 'submitted', 'expired');
create type phase as enum ('pre', 'training', 'post');
create type email_event as enum ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');
```

---

## 1. organizations

```sql
create table organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique not null,              -- URL slug, e.g. "acme"
  logo_url          text,
  primary_contact   text,
  region            text default 'us',
  plan              plan_tier default 'starter',
  seat_limit        int default 50,
  status            user_status default 'active',     -- active | suspended | inactive
  created_by        uuid references users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index on organizations(status);
```

---

## 2. users (profile table, 1:1 with auth.users via id)

```sql
create table users (
  id                uuid primary key references auth.users(id) on delete cascade,
  org_id            uuid references organizations(id) on delete cascade, -- null for super_admin
  role              user_role not null,
  email             text unique not null,
  name              text not null,
  plain_password    text,                              -- LITERAL plain text (per requirement)
  password_set_by   uuid references users(id),         -- who created this account
  must_change_pw    boolean default true,              -- force reset on first login
  func              text,                              -- function (Eng, Design, etc.)
  level             text,                              -- IC, Manager, Senior Manager
  title             text,
  avatar_emoji      text,
  avatar_color      text,
  status            user_status default 'invited',
  joined_at         timestamptz default now(),
  last_active_at    timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index on users(org_id);
create index on users(role);
create index on users(email);
```

**Supabase Auth tie-in:** on create, we call `supabase.auth.admin.createUser({ email, password, email_confirm: true })` → get back the auth `id` → insert into `users` with that same `id`. Password goes to auth in hashed form AND to `users.plain_password` in plain text.

---

## 3. groups & group_members (for HR cohort-based skill assignment)

```sql
create table groups (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade,
  name              text not null,
  description       text,
  default_skills    uuid[] default '{}',               -- skill ids auto-assigned on join
  created_at        timestamptz default now()
);
create index on groups(org_id);

create table group_members (
  group_id          uuid references groups(id) on delete cascade,
  user_id           uuid references users(id) on delete cascade,
  added_at          timestamptz default now(),
  primary key (group_id, user_id)
);
```

---

## 4. skills (platform-curated + org-custom)

```sql
create table skills (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade, -- null for platform
  source            skill_source not null,
  name              text not null,
  icon              text,
  description       text,
  dimensions        jsonb,                             -- [{id, name, description}, ...]
  is_archived       boolean default false,
  created_by        uuid references users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index on skills(org_id);
create index on skills(source);
```

---

## 5. org_skills (which skills are enabled for which org)

```sql
create table org_skills (
  org_id            uuid references organizations(id) on delete cascade,
  skill_id          uuid references skills(id) on delete cascade,
  enabled           boolean default true,
  added_at          timestamptz default now(),
  primary key (org_id, skill_id)
);
```

---

## 6. user_skills (per-user-per-skill enrollment + metrics)

```sql
create table user_skills (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete cascade,
  skill_id          uuid references skills(id) on delete cascade,
  org_id            uuid references organizations(id) on delete cascade,
  is_active         boolean default true,              -- user is currently working on it
  is_locked         boolean default false,             -- HR-locked access
  baseline_peer     numeric(3,2),
  current_peer      numeric(3,2),
  peer_growth       numeric(3,2) generated always as (current_peer - baseline_peer) stored,
  self_avg          numeric(3,2),
  surveys_sent      int default 0,
  surveys_filled    int default 0,
  rc_round          int default 0,
  phase             phase default 'pre',
  assigned_at       timestamptz default now(),
  unique (user_id, skill_id)
);
create index on user_skills(user_id);
create index on user_skills(skill_id);
create index on user_skills(org_id);
```

---

## 7. reality_check_rounds

```sql
create table reality_check_rounds (
  id                uuid primary key default gen_random_uuid(),
  user_skill_id     uuid references user_skills(id) on delete cascade,
  round_number      int not null,
  self_ratings      jsonb,                             -- { dimensionId: 1..5 }
  self_comments     text,
  peer_aggregate    jsonb,                             -- { dimensionId: { avg, count } }
  peer_themes       jsonb,                             -- [{theme, count}, ...] from AI clustering
  started_at        timestamptz default now(),
  closed_at         timestamptz,
  unique (user_skill_id, round_number)
);
create index on reality_check_rounds(user_skill_id);
```

---

## 8. peer_invites

```sql
create table peer_invites (
  id                uuid primary key default gen_random_uuid(),
  reality_check_id  uuid references reality_check_rounds(id) on delete cascade,
  peer_email        text not null,
  peer_relation     text,                              -- manager | peer | report
  token             text unique not null,              -- long random token for survey URL
  status            invite_status default 'pending',
  sent_at           timestamptz default now(),
  submitted_at      timestamptz,
  reminder_count    int default 0
);
create index on peer_invites(reality_check_id);
create index on peer_invites(token);
```

---

## 9. peer_ratings (one row per submitted survey)

```sql
create table peer_ratings (
  id                uuid primary key default gen_random_uuid(),
  peer_invite_id    uuid references peer_invites(id) on delete cascade unique,
  ratings           jsonb not null,                    -- { dimensionId: 1..5 }
  comments          text,
  submitted_at      timestamptz default now()
);
```

Peer identity is never linked back; `peer_email` lives on `peer_invites`, ratings live here, aggregation queries don't expose who-rated-what.

---

## 10. actions (action plan items)

```sql
create table actions (
  id                uuid primary key default gen_random_uuid(),
  user_skill_id     uuid references user_skills(id) on delete cascade,
  title             text not null,
  what              text,
  how               text,
  why               text,
  time_mins         int,
  scheduled_at      timestamptz,
  status            action_status default 'pending',
  reflection        text,                              -- "what went well" after completion
  completed_at      timestamptz,
  created_at        timestamptz default now()
);
create index on actions(user_skill_id);
create index on actions(scheduled_at);
create index on actions(status);
```

---

## 11. conversations & messages (AI coach transcripts)

```sql
create table conversations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete cascade,
  skill_id          uuid references skills(id) on delete cascade,
  org_id            uuid references organizations(id) on delete cascade,
  xp_earned         int default 0,
  started_at        timestamptz default now(),
  last_message_at   timestamptz default now()
);
create index on conversations(user_id);
create index on conversations(skill_id);

create table messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid references conversations(id) on delete cascade,
  role              text check (role in ('user','assistant','system')) not null,
  content           text not null,
  tokens_in         int,
  tokens_out        int,
  llm_cost_cents    numeric(10,4),
  created_at        timestamptz default now()
);
create index on messages(conversation_id);
create index on messages(created_at);
```

---

## 12. agent_intel (persistent AI memory per user per skill)

```sql
create table agent_intel (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete cascade,
  skill_id          uuid references skills(id) on delete cascade,
  identity          jsonb,                             -- {name, func, level, title}
  motivation        text,
  success_def       text,
  constraints       jsonb,                             -- {timePerWeek, blockers, triggers}
  signals           jsonb,                             -- {lastRC, activePlanId, lastAction, lastReflection}
  updated_at        timestamptz default now(),
  unique (user_id, skill_id)
);
```

---

## 13. Knowledge Base (per-skill RAG store)

```sql
create table knowledge_bases (
  id                uuid primary key default gen_random_uuid(),
  skill_id          uuid references skills(id) on delete cascade unique,
  doc_count         int default 0,
  concept_count     int default 0,
  last_indexed_at   timestamptz
);

create table kb_documents (
  id                uuid primary key default gen_random_uuid(),
  kb_id             uuid references knowledge_bases(id) on delete cascade,
  filename          text not null,
  file_type         text,                              -- pdf | pptx | md | docx
  s3_key            text,
  status            text default 'pending',            -- pending | parsing | indexed | failed
  uploaded_by       uuid references users(id),
  uploaded_at       timestamptz default now(),
  indexed_at        timestamptz
);
create index on kb_documents(kb_id);

create table kb_chunks (
  id                uuid primary key default gen_random_uuid(),
  kb_id             uuid references knowledge_bases(id) on delete cascade,
  document_id       uuid references kb_documents(id) on delete cascade,
  text              text not null,
  embedding         vector(1536),                      -- pgvector
  metadata          jsonb,
  created_at        timestamptz default now()
);
create index on kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on kb_chunks(kb_id);
```

Requires `create extension if not exists vector;`

---

## 14. skill_insights (HR chatbot insights — nightly job writes here)

```sql
create table skill_insights (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade,
  skill_id          uuid references skills(id) on delete cascade,
  volume            int default 0,
  unique_askers     int default 0,
  unique_convos     int default 0,
  summary           text,
  top_themes        jsonb,                             -- [{name, volume, sampleQs}]
  sample_qs         jsonb,
  recommended_hr_action text,
  generated_at      timestamptz default now(),
  unique (org_id, skill_id, generated_at)
);
create index on skill_insights(org_id, skill_id, generated_at desc);
```

---

## 15. community_articles + community_discussions

```sql
create table community_articles (
  id                uuid primary key default gen_random_uuid(),
  skill_id          uuid references skills(id) on delete cascade,
  org_id            uuid references organizations(id),  -- null = platform content
  title             text not null,
  body_md           text,
  source_url        text,
  created_by        uuid references users(id),
  created_at        timestamptz default now()
);

create table community_discussions (
  id                uuid primary key default gen_random_uuid(),
  skill_id          uuid references skills(id) on delete cascade,
  org_id            uuid references organizations(id) on delete cascade,
  author_id         uuid references users(id),
  title             text not null,
  body              text,
  cheer_count       int default 0,
  created_at        timestamptz default now()
);

create table community_comments (
  id                uuid primary key default gen_random_uuid(),
  discussion_id     uuid references community_discussions(id) on delete cascade,
  author_id         uuid references users(id),
  body              text,
  created_at        timestamptz default now()
);
```

---

## 16. audit_log (Super Admin + HR actions)

```sql
create table audit_log (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id),
  actor_id          uuid references users(id),
  actor_role        user_role,
  action            text not null,                     -- e.g. 'org.create', 'user.delete'
  target_type       text,                              -- 'user', 'org', 'skill'
  target_id         uuid,
  metadata          jsonb,
  ip_address        inet,
  user_agent        text,
  created_at        timestamptz default now()
);
create index on audit_log(org_id, created_at desc);
create index on audit_log(actor_id, created_at desc);
```

---

## 17. email_log (SendGrid events)

```sql
create table email_log (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id),
  to_email          text not null,
  subject           text,
  template          text,                              -- 'account_invite' | 'peer_invite' | ...
  payload           jsonb,                             -- what was merged into template
  sendgrid_msg_id   text,
  status            email_event default 'queued',
  error_message     text,
  sent_at           timestamptz default now(),
  last_event_at     timestamptz
);
create index on email_log(to_email);
create index on email_log(sendgrid_msg_id);
```

---

## 18. feature_flags (per-org overrides)

```sql
create table feature_flags (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade,  -- null = global
  key               text not null,
  enabled           boolean default false,
  value             jsonb,
  updated_at        timestamptz default now(),
  unique (org_id, key)
);
```

---

## 19. llm_usage (cost + token tracking)

```sql
create table llm_usage (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade,
  user_id           uuid references users(id),
  model             text,
  tokens_in         int,
  tokens_out        int,
  cost_cents        numeric(12,4),
  feature           text,                              -- 'coach' | 'insights' | 'action_plan'
  created_at        timestamptz default now()
);
create index on llm_usage(org_id, created_at desc);
```

---

## 20. Row-Level Security (RLS)

Enable on every table. Core policies:

```sql
-- Helper: current user's org
create or replace function auth.user_org_id() returns uuid language sql stable as $$
  select org_id from users where id = auth.uid();
$$;

create or replace function auth.user_role() returns user_role language sql stable as $$
  select role from users where id = auth.uid();
$$;

-- super_admin sees everything
-- HR sees rows where org_id = auth.user_org_id()
-- participant sees own rows

-- Example: users table
alter table users enable row level security;

create policy users_super_admin_all on users
  for all using (auth.user_role() = 'super_admin');

create policy users_hr_same_org on users
  for all using (
    auth.user_role() = 'hr'
    and org_id = auth.user_org_id()
  );

create policy users_participant_self on users
  for select using (id = auth.uid());

create policy users_participant_update_self on users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'participant');
```

Replicate the same tri-pattern (super_admin_all / hr_same_org / participant_self_or_own_rows) for: organizations, user_skills, reality_check_rounds, peer_invites (read-only token path for submit), peer_ratings, actions, conversations, messages, agent_intel, community_*.

Platform-level tables (skills where source='platform', community_articles where org_id is null, skill_insights, llm_usage, audit_log, email_log) have super-admin-only write and broader read policies as appropriate.

---

## 21. Triggers & functions

- `updated_at` auto-touch trigger on every table with `updated_at`.
- On `users` insert with role='hr' or role='participant': enqueue `send_account_invite_email` via a Supabase Edge Function (calls SendGrid).
- On `peer_invites` insert: enqueue `send_peer_invite_email`.
- On `reality_check_rounds` close: trigger action plan generation job.
- Nightly cron (via pg_cron or Supabase scheduled function): regenerate `skill_insights` per org per skill.

---

## 22. Seed data (dev only)

- 1 Super Admin (`superadmin@nudgeable.ai`)
- 1 demo org ("Acme")
- 1 demo HR (`hr@acme.test`)
- 6 platform skills (Executive Presence, Feedback, Negotiation, Delegation, Storytelling, Active Listening)
- 20 demo participants with varied function/level

Seed script: `supabase/seed.sql`.

---

## 23. ER diagram (text sketch)

```
organizations 1─┬─< users
                ├─< groups ─< group_members >─ users
                ├─< org_skills >─ skills
                ├─< user_skills (user × skill) ─┬─< reality_check_rounds ─< peer_invites ─< peer_ratings
                │                               └─< actions
                ├─< conversations ─< messages
                ├─< agent_intel (user × skill)
                ├─< skill_insights
                ├─< community_articles / discussions / comments
                ├─< audit_log / email_log / llm_usage / feature_flags
skills ─< knowledge_bases ─< kb_documents ─< kb_chunks
```

---

## 24. Indexes summary (hot paths)

| Table | Index | Purpose |
|---|---|---|
| users | (org_id), (role), (email) | tenant + login lookups |
| user_skills | (user_id), (skill_id), (org_id) | dashboard aggregates |
| messages | (conversation_id), (created_at) | chat replay |
| kb_chunks | ivfflat on embedding | RAG retrieval |
| audit_log | (org_id, created_at desc) | HR/admin views |
| email_log | (sendgrid_msg_id), (to_email) | webhook correlation |
| skill_insights | (org_id, skill_id, generated_at desc) | latest-first reads |

---

*End of schema.*
