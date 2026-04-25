-- 0003_agent_intel_profile.sql
--
-- Adds a structured `profile` JSONB column to agent_intel so the chat UI
-- can fill named slots (role, fn, level, goal, blocker, frequency, …)
-- deterministically without needing an LLM extraction pass.
--
-- The legacy free-text columns (current_level / context / motivations /
-- blockers / raw_summary) are left in place for backwards compatibility,
-- but new code reads/writes through `profile`.

alter table public.agent_intel
  add column if not exists profile jsonb not null default '{}'::jsonb;

comment on column public.agent_intel.profile is
  'Structured per-skill profile. Keys: role, fn, level, goal, blocker, frequency. Filled deterministically from chat slot answers and side-panel edits.';
