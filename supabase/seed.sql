-- supabase/seed.sql
-- Dev seed: 1 super admin, 1 org, 1 HR, 6 skills, 8 participants
-- Run after: supabase db reset

-- NOTE: Auth users must be created via Supabase Auth Admin API or the seed script below.
-- This file seeds the profile tables AFTER auth users exist.
-- For local dev, use `supabase/seed-auth.ts` (a small script) or create users via Studio.

-- Demo org
insert into organizations (id, name, slug, plan, seat_limit, status)
values ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme', 'growth', 50, 'active');

-- Platform skills
insert into skills (id, source, name, icon, description, dimensions) values
  ('10000000-0000-0000-0000-000000000001', 'platform', 'Executive Presence', '🎤',
   'Command attention and inspire confidence in high-stakes situations.',
   '[{"id":"ep1","name":"Gravitas","description":"Exuding calm authority"},{"id":"ep2","name":"Communication","description":"Clear, compelling speech"},{"id":"ep3","name":"Appearance","description":"Non-verbal signaling"}]'),

  ('10000000-0000-0000-0000-000000000002', 'platform', 'Giving Feedback', '💬',
   'Deliver honest, actionable feedback that helps people grow.',
   '[{"id":"fb1","name":"Timing","description":"Choosing the right moment"},{"id":"fb2","name":"Specificity","description":"Concrete, behavioral focus"},{"id":"fb3","name":"Impact","description":"Linking to outcomes"}]'),

  ('10000000-0000-0000-0000-000000000003', 'platform', 'Negotiation', '🤝',
   'Reach mutually beneficial agreements with confidence.',
   '[{"id":"ng1","name":"Preparation","description":"Research and planning"},{"id":"ng2","name":"Listening","description":"Understanding interests"},{"id":"ng3","name":"Closing","description":"Securing commitment"}]'),

  ('10000000-0000-0000-0000-000000000004', 'platform', 'Delegation', '📋',
   'Trust others with meaningful work and set them up for success.',
   '[{"id":"dg1","name":"Clarity","description":"Clear task handoff"},{"id":"dg2","name":"Follow-through","description":"Appropriate check-ins"},{"id":"dg3","name":"Trust","description":"Letting go of control"}]'),

  ('10000000-0000-0000-0000-000000000005', 'platform', 'Storytelling', '📖',
   'Make your ideas memorable through narrative.',
   '[{"id":"st1","name":"Structure","description":"Beginning, middle, end"},{"id":"st2","name":"Emotion","description":"Creating connection"},{"id":"st3","name":"Brevity","description":"Cutting the unnecessary"}]'),

  ('10000000-0000-0000-0000-000000000006', 'platform', 'Active Listening', '👂',
   'Understand before being understood.',
   '[{"id":"al1","name":"Presence","description":"Full attention without distraction"},{"id":"al2","name":"Reflection","description":"Paraphrasing and clarifying"},{"id":"al3","name":"Response","description":"Thoughtful not reactive"}]');

-- Enable all platform skills for Acme
insert into org_skills (org_id, skill_id, enabled)
select '00000000-0000-0000-0000-000000000001', id, true from skills where source = 'platform';

-- Placeholder: actual user rows are inserted by the application when auth users are created
-- See scripts/create-demo-users.ts for the full seed flow

select 'Seed complete. Create auth users via the app or Studio.' as message;
