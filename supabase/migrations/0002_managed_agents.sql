-- supabase/migrations/0002_managed_agents.sql
-- Anthropic Managed Agents integration:
--   * Per-user memory_store ID (one persistent memory store per participant)
--   * Per-conversation session ID (a Claude Session that streams events)
--   * Platform-wide agent registry (the Nudge Coach agent + environment)

-- ── Platform agent registry (single row managed by super-admin) ────────────
create table if not exists platform_agents (
  id              text primary key default 'default',
  agent_id        text not null,
  agent_version   int  not null default 1,
  environment_id  text not null,
  model           text not null default 'claude-opus-4-7',
  beta_header     text not null default 'managed-agents-2026-04-01',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger platform_agents_updated_at before update on platform_agents
  for each row execute function set_updated_at();

alter table platform_agents enable row level security;

-- Only super_admin can manage; HR + participants can read (so the chat API can fetch ids)
create policy platform_agents_super_admin on platform_agents
  for all using (public.user_role() = 'super_admin');
create policy platform_agents_read_all on platform_agents
  for select using (auth.uid() is not null);

-- ── Per-user memory store ───────────────────────────────────────────────────
alter table users
  add column if not exists memory_store_id text,
  add column if not exists memory_store_created_at timestamptz;

create index if not exists users_memory_store_idx on users(memory_store_id);

-- ── Per-conversation Claude session ─────────────────────────────────────────
alter table conversations
  add column if not exists session_id text,
  add column if not exists session_status text,           -- idle | running | failed
  add column if not exists last_event_id text,
  add column if not exists agent_version int;

create index if not exists conversations_session_idx on conversations(session_id);

-- ── Per-message tool calls (denormalized for fast UI render) ────────────────
alter table messages
  add column if not exists tool_events jsonb,
  add column if not exists event_id text;

-- ── Helpful comment markers ─────────────────────────────────────────────────
comment on table platform_agents is 'Singleton row per workspace describing the Anthropic Managed Agent + Environment used by the Nudge coach.';
comment on column users.memory_store_id is 'Anthropic memstore_... id mounted at /mnt/memory/user/ in every session for this user.';
comment on column conversations.session_id is 'Anthropic session_... id. Persists context server-side across page reloads.';
