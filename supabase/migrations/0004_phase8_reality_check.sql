-- 0004_phase8_reality_check.sql
--
-- Phase 8 — Reality Check.
--
-- 1. peer_invites.peer_name  : human-readable name for the peer being asked
--    (the original schema only stored peer_email + peer_relation; the
--     UI in the L&D mock picks "Meera (Manager)" so we need the name).
-- 2. Backfill the relation enum-ish values are kept as free text (manager,
--    peer, report, cross_fn) to stay flexible; we don't add a CHECK so HR
--    can override later.

alter table public.peer_invites
  add column if not exists peer_name text;

comment on column public.peer_invites.peer_name is
  'Display name shown on the survey page (e.g. "Meera"). Optional.';
