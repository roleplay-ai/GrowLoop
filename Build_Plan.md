# Nudgeable — Step-by-Step Build Plan

For future sessions. Each phase is self-contained and can be picked up in a fresh session by pointing to this file + `DB_Schema.md` + `Features_By_Role.md`.

**Stack lock-in:** Next.js 14 (App Router, TypeScript) · Supabase (Postgres + Auth + Storage) · SendGrid (email) · OpenAI or Anthropic Claude (chatbot) · pgvector (RAG) · Tailwind + shadcn/ui (UI) · Vercel (hosting).

**Password model:** Supabase Auth holds the hashed password for login; `users.plain_password TEXT` stores the literal plain text so HR/Super Admin can email credentials. Documented risk, accepted by stakeholder.

---

## Phase 0 — Environment & Repo Setup

Goal: working dev environment.

1. Create GitHub repo `nudgeable-web`.
2. `npx create-next-app@latest` with TypeScript, Tailwind, App Router, ESLint.
3. Add shadcn/ui, lucide-react, zod, react-hook-form, swr or tanstack-query.
4. Create Supabase project (dev). Save URL + anon key + service role key.
5. Create SendGrid account, verify sender domain, create API key.
6. Create OpenAI or Anthropic account, save API key.
7. `.env.local` keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`), `APP_URL`.
8. Add Supabase CLI, `supabase init`, link to project.
9. Add Vercel project, connect repo, set env vars.

**Deliverable:** empty Next.js app deployed to Vercel, Supabase connected.

---

## Phase 1 — Database Foundation

Goal: full schema + RLS + seed data.

1. Create all enums from `DB_Schema.md` §3.
2. Create all tables from `DB_Schema.md` §4–§20 in a single migration file `0001_init.sql`.
3. Add indexes from §22.
4. Add helper functions `auth.user_org_id()`, `auth.user_role()`.
5. Add RLS policies per §21 for every table (super_admin_all, hr_same_org, participant_self).
6. Add triggers: `updated_at`, `send_account_invite_email` (on users insert), `send_peer_invite_email` (on peer_invites insert), action-plan-generation hook (on RC round close).
7. Enable pgvector extension; create `kb_chunks.embedding vector(1536)` index.
8. Seed data: 1 super admin, 1 demo org, 1 demo HR, 5 demo participants, 10 global skills with rubrics.
9. Write migration test: `supabase db reset` runs clean.

**Deliverable:** `supabase db push` deploys the entire schema with zero errors. Seed data visible in Supabase Studio.

---

## Phase 2 — Auth & Role-Based Access

Goal: login works for all 3 roles with proper redirects.

1. Supabase Auth client (`@supabase/ssr`) in Next.js — server + client helpers.
2. `/login` page — email + password form → `supabase.auth.signInWithPassword`.
3. On login, fetch `users.role` from custom table and store in session.
4. Middleware (`middleware.ts`) — protect `/super-admin/*`, `/hr/*`, `/app/*` routes by role.
5. `/logout` action.
6. `/forgot-password` + `/reset-password` flow.
7. Forced-password-change screen on first login (if `users.must_change_password = true`).
8. Role-based landing redirect after login.

**Deliverable:** three test users (super admin, HR, participant) can log in, land on their dashboards, and are blocked from other roles' routes.

---

## Phase 3 — Super Admin: Org & HR Provisioning

Goal: Super Admin can create orgs and HR users; HR receives welcome email with login credentials.

1. `/super-admin/orgs` — list, create, edit, suspend org.
2. Create-org form: name, plan, seat limit. Server action inserts into `organizations`.
3. `/super-admin/orgs/[id]/hr` — list & create HR users.
4. Create-HR server action:
   - Generate random password (12 chars).
   - Call `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
   - Insert into `users` with `id = auth user id`, `role = 'hr'`, `plain_password = generatedPw`, `org_id`.
   - Insert into `email_log` + call SendGrid template `account_invite` with `{login_url, email, password}`.
5. Build SendGrid dynamic template "Account Invite".
6. Resend welcome email action.
7. Reset HR password action (regenerates + re-emails).

**Deliverable:** Super Admin creates an org + HR. HR receives email with credentials and logs in.

---

## Phase 4 — HR: Participant Provisioning

Goal: HR can invite participants, participants receive email + log in.

1. `/hr/participants` — list with filters, search.
2. Single add participant (mirrors Phase 3 flow for `role = 'participant'`).
3. CSV bulk import — upload, preview, create in batch, email each.
4. `/hr/groups` — create groups, assign participants.
5. Edit / deactivate / reset-password / resend-invite actions.

**Deliverable:** HR invites 10 participants via CSV, all receive email and log in.

---

## Phase 5 — Skills Library

Goal: global + per-org skill catalog.

1. `/super-admin/skills` — global catalog CRUD.
2. Rubric editor: 5-level descriptors.
3. `/hr/skills` — clone global skill → org-scoped skill; custom skill CRUD.
4. `/app/skills` (participant) — browse, filter, pick skill → insert into `user_skills` with `phase = 'onboarding'`.
5. Pin/pause/drop skill actions.

**Deliverable:** participant can pick a skill and see it on their dashboard.

---

## Phase 6 — Chatbot Core (Onboarding Phase)

Goal: participant talks to chatbot for a chosen skill; Agent Intel is captured.

1. `/app/skills/[userSkillId]/chat` — chat UI (shadcn), streaming responses.
2. API route `/api/chat` — streams from OpenAI/Claude.
3. System prompt factory — loads prompt by phase (`onboarding`) from `prompts` table.
4. Persist every message to `messages` table under a `conversations` row.
5. After N turns, call summarizer → write structured JSON into `agent_intel`.
6. Phase transition logic: when onboarding intel is complete, advance `user_skills.phase` to `peer_selection`.

**Deliverable:** participant completes onboarding chat; Agent Intel row created; phase advances.

---

## Phase 7 — Reality Check (Peer Invites + Ratings)

Goal: participant invites peers; peers complete rating; round closes; self-score captured.

1. Peer selection UI inside chat — add name, email, relationship.
2. On submit, create `reality_check_rounds` row + `peer_invites` rows.
3. Trigger sends peer invite emails via SendGrid template `peer_invite` with `{participant_name, skill, survey_url}`.
4. `/peer-survey/[token]` — anonymous, tokenized survey page (no login). Rubric-based rating + open comments. Rate-limited, captcha-protected.
5. Insert into `peer_ratings`; mark invite as completed.
6. Self-rating sub-flow inside chatbot.
7. Close round when self done + min peers responded (or after 14 days). Compute scores, themes (LLM), store on round.
8. Results screen for participant.

**Deliverable:** round end-to-end with 3 peer responses + self → score + themes displayed.

---

## Phase 8 — Action Plan + Nudging

Goal: chatbot generates an action plan; participant works through it; receives nudges.

1. On round close trigger, LLM generates 3–7 actions → insert into `actions`.
2. `/app/skills/[id]/plan` — plan view with check-off.
3. Nudge engine:
   - Cron job reads participants' nudge cadence.
   - For each pending action, send in-app + email nudge.
   - Logs in `email_log`.
4. Chat-initiated action updates ("I did X yesterday") → chatbot marks action done + reflects.
5. Streak tracking.

**Deliverable:** participant completes 3 actions over a week with nudges firing.

---

## Phase 9 — Re-Survey & Growth

Goal: participant runs round 2; system compares scores.

1. Participant triggers "re-run reality check" from plan screen.
2. Repeat Phase 7 flow → round 2.
3. Growth comparison view: R1 vs R2 per rubric dimension, theme shift.
4. Chatbot reflection conversation on progress.

**Deliverable:** participant sees R1 → R2 comparison with deltas.

---

## Phase 10 — HR Insights Dashboard

Goal: HR sees aggregate insights mirroring the prototype.

1. Nightly cron: compute `skill_insights` per org × skill (avg peer, growth, themes, AI action, top scorers, top growers) via LLM + SQL aggregates.
2. `/hr/insights` — skill cards grid, usage health row, KPI tiles.
3. Drill-down: `/hr/insights/[skillId]` — participant table with growth deltas.
4. Group + date range filters.
5. CSV + PDF export.

**Deliverable:** HR dashboard matches the HTML prototype, powered by real data.

---

## Phase 11 — Knowledge Base (RAG)

Goal: chatbot pulls from curated KB for richer coaching.

1. Super Admin KB upload (PDF, DOCX, URL) → Supabase Storage.
2. Background job: parse → chunk → embed (pgvector).
3. Tag chunks by skill.
4. Chatbot retrieval step: before generating a reply, query top-k chunks filtered by skill.
5. Inject into system prompt.

**Deliverable:** chatbot cites KB tips when relevant.

---

## Phase 12 — Community (Optional V1)

1. Skill rooms with posts + likes + comments.
2. Moderation queue.
3. Report/flag flow.

---

## Phase 13 — Billing, Observability, Polish

1. Stripe Checkout integration for plan upgrades (HR self-serve).
2. Invoice download.
3. Audit log viewer (Super Admin).
4. LLM usage dashboard.
5. Error tracking (Sentry).
6. Analytics (PostHog or Mixpanel).
7. Accessibility audit.
8. Dark mode.
9. Mobile polish + PWA install.

---

## Phase 14 — Launch Prep

1. Privacy policy + ToS.
2. GDPR data export + delete endpoints.
3. Load test (k6) on auth + chat endpoints.
4. Penetration test review.
5. Support handbook.
6. First customer onboarding playbook.

---

## Cross-Cutting Rules

- Every table access from the app goes through RLS — no service-role reads from the browser.
- Every destructive admin action writes to `audit_log`.
- Every email goes through SendGrid + logs to `email_log`.
- Every LLM call logs to `llm_usage` (tokens, cost, latency, user_id, org_id).
- Feature flags gate anything new; default OFF in prod.
- Migrations are additive; never drop columns in the same release that introduces replacements.
- Secrets live in Vercel env vars; never in the repo.

## How to Resume in a New Session

Point the next session to these three files:

1. `DB_Schema.md` — full database structure.
2. `Features_By_Role.md` — all features by role.
3. `Build_Plan.md` — this file.

Say: "We are at Phase N. Continue from step X." Provide any new decisions or changes since the last session.
