# Nudgeable — Cursor Implementation Plan
**For use in Cursor AI sessions. Each session is self-contained.**

Reference files in every session:
- `DB_Schema.md` — full database schema
- `Features_By_Role.md` — all features by role
- `Build_Plan.md` — original phase plan
- `CURSOR_PLAN.md` — this file

---

## How to start a Cursor session

Paste this at the start of every new chat:

```
We are building Nudgeable — an AI-powered skill growth SaaS.
Stack: Next.js 14 App Router + TypeScript + Supabase + Tailwind + shadcn/ui + Anthropic Claude.
Reference files: DB_Schema.md, Features_By_Role.md, Build_Plan.md.
Current task: [PHASE NAME] — [STEP NAME]
All types live in src/lib/types/index.ts.
All Supabase calls go through src/lib/supabase/server.ts (server) or client.ts (browser).
Brand colors: yellow=#FFCE00, purple=#623CEA, green=#23CE68, orange=#F68A29, dark=#221D23, cream=#FFFDF5.
```

---

## PHASE 1 — Supabase Setup & Seed
**Session goal:** Working DB with full schema + seed data

### Steps for Cursor

**1.1 Run initial migration**
```
Prompt: "Run the migration in supabase/migrations/0001_init.sql against my local Supabase.
Write a shell script scripts/db-setup.sh that:
1. Runs supabase db reset
2. Applies the migration
3. Runs supabase/seed.sql
4. Verifies tables exist by listing them"
```

**1.2 Create demo users script**
```
Prompt: "Create scripts/create-demo-users.ts that uses the Supabase service role key to:
1. Create a super admin user: superadmin@nudgeable.ai / Admin1234!
2. Create HR user: hr@acme.test / HR1234! — linked to org id 00000000-0000-0000-0000-000000000001
3. Create 5 participant users: p1@acme.test through p5@acme.test / Pass1234!
4. Insert matching rows into the users profile table with realistic names, avatar_emoji, avatar_color
5. Assign each participant 1-2 user_skills rows with varied phases
6. Print a summary table of created users"
```

**1.3 Generate TypeScript types from Supabase**
```
Prompt: "Run: npx supabase gen types typescript --local > src/lib/types/database.ts
Then update src/lib/types/index.ts to re-export and extend the generated types where needed."
```

**1.4 Verify RLS**
```
Prompt: "Write a test file tests/rls.test.ts using @supabase/supabase-js that:
1. Signs in as each role (super admin, hr, participant)
2. Verifies super admin can read all orgs
3. Verifies HR can only read users in their org
4. Verifies participant can only read their own rows
5. Run with: npx tsx tests/rls.test.ts"
```

---

## PHASE 2 — Auth Flows
**Session goal:** All auth flows working end-to-end

### Steps for Cursor

**2.1 Force password change screen**
```
Prompt: "Build src/app/change-password/page.tsx:
1. Shown when users.must_change_pw = true (middleware redirects here)
2. Form: new password + confirm
3. On submit: calls supabase.auth.updateUser({ password }) AND sets users.must_change_pw = false
4. On success: redirect to role's home dashboard
5. Cannot be skipped (middleware enforces it)"
```

**2.2 Auth context hook**
```
Prompt: "Create src/lib/hooks/useUser.ts — a React hook that:
1. Returns the current user profile (from users table, not auth.users)
2. Uses SWR or React Query for caching
3. Returns { user, role, isLoading, isHR, isParticipant, isSuperAdmin }
4. Uses createClient() from src/lib/supabase/client.ts"
```

**2.3 Session refresh in layout**
```
Prompt: "Update src/app/layout.tsx to include a client component that calls
supabase.auth.onAuthStateChange() and refreshes the router when session changes.
This prevents stale sessions after token expiry."
```

---

## PHASE 3 — Participant Skills UI
**Session goal:** Participants can browse skills, view details, and enroll

### Steps for Cursor

**3.1 Skill detail page**
```
Prompt: "Build src/app/(app)/skills/[skillId]/page.tsx — a 'skill preview' page before enrollment:
1. Skill name, icon, description
2. 'Why this matters' section (from skill.description)
3. Dimensions accordion — show each dimension with its rubric levels
4. 'Start this skill' CTA → calls enroll action → redirects to /app/skills/[userSkillId]/chat
5. 'Already enrolled' state if user has this skill"
```

**3.2 Enroll in skill action**
```
Prompt: "Create src/app/(app)/skills/actions.ts:
1. enrollInSkill(skillId): creates user_skills row with phase='pre', is_active=true
2. Validates skill is enabled for user's org (check org_skills table)
3. Returns the new userSkillId
4. Write to audit_log"
```

**3.3 My skills dashboard**
```
Prompt: "Enhance src/app/(app)/skills/page.tsx:
1. Two sections: 'My Skills' (enrolled) and 'Explore Skills' (available)
2. My Skills shows progress: phase badge, last activity, peer score if available
3. Explore Skills shows org-enabled skills user hasn't enrolled in yet
4. Empty state for new users: 'Pick your first skill to start growing'"
```

**3.4 Skill navigation tabs**
```
Prompt: "Build src/app/(app)/skills/[userSkillId]/layout.tsx:
1. Tabs: Chat | Plan | Progress | Intel
2. Breadcrumb: Skills > [Skill Name]
3. Phase badge in header (pre/training/post)
4. Active tab styling with brand-purple underline"
```

---

## PHASE 4 — Super Admin: Org & HR Provisioning
**Session goal:** Super Admin can create orgs and provision HR accounts (without email initially)

### Steps for Cursor

**4.1 Create org server action**
```
Prompt: "Create src/app/(super-admin)/orgs/actions.ts with server actions:
1. createOrg(formData): validates with zod, inserts into organizations, writes audit_log
2. updateOrg(id, formData): validates, updates, audit logs
3. suspendOrg(id): sets status='suspended' for org AND all its users, audit logs
4. reactivateOrg(id): reverses suspension
All actions use createServiceClient() (service role) and check caller is super_admin."
```

**4.2 Create org modal**
```
Prompt: "Build src/components/super-admin/CreateOrgModal.tsx:
- Dialog triggered by '+ New org' button on /super-admin/orgs
- Fields: Organization name, slug (auto-generated from name, editable), Plan (starter/growth/enterprise), Seat limit
- Uses react-hook-form + zod for validation
- Calls createOrg server action
- Shows toast on success, inline errors on failure
- Matches Nudgeable brand: dark background card, yellow accents"
```

**4.3 HR provisioning**
```
Prompt: "Create src/app/(super-admin)/orgs/[id]/hr/page.tsx and actions:
1. Page: lists HR users for this org, shows their status and last active
2. Create HR action in actions.ts:
   a. Generate random 12-char password (uppercase + lowercase + digits)
   b. Call supabase.auth.admin.createUser({ email, password, email_confirm: true })
   c. Insert into users table: role='hr', org_id, plain_password, must_change_pw=true
   d. Insert into audit_log
   e. Show generated credentials in modal (email sent in Phase 11)
3. CreateHRModal component: name, email fields"
```

**4.4 Password management actions**
```
Prompt: "Add to the HR user management:
1. resetPassword(userId): regenerates password, updates users.plain_password, shows in modal
2. deactivateHR(userId): sets status='inactive'
All write to audit_log."
```

---

## PHASE 5 — HR: Participant Management ✅ COMPLETED
**Session goal:** HR can create, manage, and bulk import participants (without email initially)

**Completed deliverables:**
- `src/app/(hr)/participants/actions.ts` — createParticipant, updateParticipant, deactivate, reactivate, resetPw, bulkCreate
- `src/components/hr/AddParticipantModal.tsx` — manual password entry with confirm, credentials display
- `src/components/hr/EditParticipantModal.tsx` — edit name/title/func/group
- `src/components/hr/CSVImportModal.tsx` — file upload, validation preview, bulk import, credentials CSV export
- `src/components/hr/ParticipantsTable.tsx` — wired up edit/reset/deactivate buttons, status filter, seat usage display
- `src/app/(hr)/groups/actions.ts` — createGroup, updateGroup, deleteGroup, addParticipantToGroup, removeParticipantFromGroup
- `src/app/(hr)/groups/page.tsx` — fetch groups + participants
- `src/components/hr/GroupsManager.tsx` — grid UI with expandable members, add/remove, edit/delete
- Groups use `group_members` junction table (not a column on users)
- Seat limit enforcement: checks organizations.seat_limit before creation
- Audit log entries for all actions


### Steps for Cursor

**5.1 Participant create action**
```
Prompt: "Create src/app/(hr)/participants/actions.ts:
1. createParticipant(formData): mirrors Phase 4 HR provisioning but role='participant'
2. Validate seat limit not exceeded (check organizations.seat_limit vs active participant count)
3. Write audit_log
4. Return generated credentials to show in modal"
```

**5.2 Add participant modal**
```
Prompt: "Build src/components/hr/AddParticipantModal.tsx:
- Fields: Full name, Email, Title/Role (optional), Function (optional), Group (dropdown of org groups)
- On submit calls createParticipant server action
- Shows generated password in success state (can copy)
- Shows toast on success"
```

**5.3 CSV bulk import**
```
Prompt: "Build src/components/hr/CSVImportModal.tsx:
1. File upload (accept .csv) — parse client-side with papaparse
2. Preview table: show first 5 rows, validate email format, flag duplicates
3. Expected columns: name, email, title, func, group_name
4. 'Import' button calls src/app/(hr)/participants/actions.ts bulkCreateParticipants()
5. bulkCreateParticipants: loops through validated rows, calls createParticipant for each
6. Returns { created, failed, errors[], credentials[] }
7. Show summary with downloadable credentials CSV"
```

**5.4 Edit + deactivate participant**
```
Prompt: "Add to ParticipantsTable:
1. Edit modal: editable fields name, title, func — calls updateParticipant server action
2. Deactivate: sets status='inactive' and is_active=false on all their user_skills
3. Reset password: regenerates and shows new password
All rows in ParticipantsTable should have action buttons wired up."
```

**5.5 Groups management page**
```
Prompt: "Build src/app/(hr)/groups/page.tsx:
1. List groups with member count
2. CreateGroup modal: name, description
3. Each group card: click → expand to show members
4. Add/remove participants from groups (multi-select dropdown)
5. Server actions in src/app/(hr)/groups/actions.ts"
```

---

## PHASE 6 — Skills Library (Admin)
**Session goal:** Super Admin manages platform skills; HR clones/customizes for org

### Steps for Cursor

**6.1 Super Admin skills page**
```
Prompt: "Build src/app/(super-admin)/skills/page.tsx:
1. Grid of platform skills with name, icon, dimension count, usage count
2. CreateSkillModal: name, icon (emoji picker), description, category
3. DimensionsEditor: add/edit up to 6 dimensions (name + description + 5-level rubric)
4. Archive skill action
5. CSV import for bulk skill creation
All mutations in src/app/(super-admin)/skills/actions.ts"
```

**6.2 HR skills page**
```
Prompt: "Build src/app/(hr)/skills/page.tsx:
1. Split view: Platform Skills (read-only) | Our Skills (org-scoped)
2. 'Clone to org' button on platform skills → copies skill row with org_id set, source='org_custom'
3. Edit cloned skills (dimensions, description)
4. Enable/disable skills for org via org_skills table
5. 'Feature this skill' toggle (recommended to participants)"
```

---

## PHASE 7 — Chatbot: Onboarding Phase
**Session goal:** Full onboarding conversation that captures Agent Intel

### Steps for Cursor

**7.1 Enhance chat API with Agent Intel capture**
```
Prompt: "Update src/app/api/chat/route.ts:
1. After every 6th assistant message in the 'pre' phase, call a separate LLM summarization:
   - System: 'Extract structured intel from this conversation as JSON: { current_level, context, motivations[], blockers[] }'
   - Pass the last 12 messages
   - Upsert into agent_intel table
2. After intel is saved, check if the conversation has enough signal to advance to 'training' phase
   - Condition: agent_intel.current_level is non-empty AND at least 8 total messages
3. If ready: update user_skills.phase = 'training' and return a header 'X-Phase-Changed: training'"
```

**7.2 Chat page phase transition UI**
```
Prompt: "Update src/components/chat/ChatWindow.tsx:
1. Listen for 'X-Phase-Changed' header in the fetch response
2. When detected: show a phase transition banner animation (fade-up, yellow/green gradient)
   - 'Onboarding complete! Moving to Reality Check phase…'
3. After 2 seconds, refresh the page so the new phase prompt loads
4. The phase badge in Topbar should update reactively"
```

**7.3 Agent Intel viewer for participant**
```
Prompt: "Build src/app/(app)/skills/[userSkillId]/intel/page.tsx:
1. Shows what the AI has learned about the participant for this skill
2. Cards for: Current Level, Context, Motivations, Blockers
3. Edit toggle: participant can correct/add to the intel
4. Privacy note: 'Shared with HR only if you toggle below'
5. Toggle: share_intel_with_hr boolean on agent_intel row"
```

---

## PHASE 8 — Reality Check UI
**Session goal:** Full RC round UI — peer selection, self-rating, results display

### Steps for Cursor

**8.1 Peer selection UI in chat**
```
Prompt: "When phase='training', after the AI explains the Reality Check, show an inline peer-selection form inside the chat:
- Component: src/components/chat/PeerSelectForm.tsx
- Fields: peer name, peer email, relationship (Manager/Peer/Report/Cross-functional)
- Add up to 8 peers, min 3
- 'Send invites' button → calls src/app/api/reality-check/start/route.ts
- API creates reality_check_rounds row, creates peer_invites rows (email sending added in Phase 11)
- Show 'Invite link copied' option for manual sharing"
```

**8.2 Peer survey page (anonymous, no login)**
```
Prompt: "Build src/app/peer-survey/[token]/page.tsx:
1. Public page — no auth required
2. Look up peer_invites by token; if not found or expired → show error
3. Load the skill dimensions from the linked user_skill → skill
4. For each dimension: show name, description, and a 1-5 radio rating
5. Open text comment field
6. Submit → insert peer_ratings, update peer_invites.status='submitted', peer_invites.submitted_at=now()
7. Confirmation screen: 'Thanks! Your feedback has been submitted anonymously.'
8. Rate limit: 1 submission per token (enforced by unique constraint on peer_ratings.peer_invite_id)"
```

**8.3 Self-rating flow**
```
Prompt: "Build src/components/chat/SelfRatingForm.tsx:
- Shown in chat when training phase is active and RC round exists
- Same rubric dimensions as peer survey
- Submit → update reality_check_rounds.self_ratings and self_comments
- After submit, chat continues with AI reflection"
```

**8.4 Round close + score computation**
```
Prompt: "Create src/app/api/reality-check/close/route.ts (POST, authenticated):
1. Input: { userSkillId }
2. Check: self_ratings filled AND at least 3 peer_ratings submitted (or 14 days since start)
3. Compute: peer_aggregate = average ratings per dimension across all peer_ratings
4. Call LLM to cluster peer comments into 3-5 themes → save to reality_check_rounds.peer_themes
5. Compute: overall peer avg, overall self avg
6. Update user_skills: current_peer, self_avg, baseline_peer (if rc_round=0), rc_round++
7. Update user_skills.phase = 'post'
8. Trigger action plan generation (call /api/action-plan/generate)"
```

**8.5 Results display**
```
Prompt: "Build src/app/(app)/skills/[userSkillId]/results/page.tsx:
1. Score comparison: self vs peer per dimension (radar or bar chart with recharts)
2. Peer themes as tag chips
3. Strengths section (top 2 dimensions by peer score)
4. Growth areas section (bottom 2 dimensions by gap)
5. 'View action plan' CTA
Use the brand palette — purple for peer bars, orange for self."
```

---

## PHASE 9 — Action Plan UI
**Session goal:** AI generates action plan; participant completes actions; in-app nudges

### Steps for Cursor

**9.1 Action plan generation API**
```
Prompt: "Create src/app/api/action-plan/generate/route.ts:
1. Input: { userSkillId }
2. Load: user_skills + skill dimensions + reality_check_round (latest) + agent_intel
3. Build prompt: 'Based on these RC results and what you know about this person, generate 4-6 specific, actionable items they can do in the next 30 days to improve [skill]. Format as JSON: [{title, what, why, how, difficulty(1-5), effort_days}]'
4. Parse JSON response, insert into actions table
5. Log to llm_usage"
```

**9.2 Action plan page**
```
Prompt: "Build src/app/(app)/plan/page.tsx and src/app/(app)/skills/[userSkillId]/plan/page.tsx:
1. Card per action: title, what/why/how expandable, difficulty dots, due date
2. Check-off button → updates action.status='done', action.done_at=now()
3. Skip button → status='skipped'
4. Add note → text input below action card, saved to action.notes
5. Progress bar: X of Y actions complete
6. Streak counter (consecutive days with an action done)
7. 'Ask coach to adjust plan' → opens chat with pre-filled message"
```

**9.3 In-app nudge cards**
```
Prompt: "Build src/components/shared/NudgeCard.tsx:
- Shown on the participant dashboard when an action is overdue
- Floating card at bottom of skills page with: action title, skill name, CTA button
- Dismiss (snooze 24h) stores a 'snoozed_until' timestamp client-side
- Animation: slides up from bottom on load"
```

---

## PHASE 10 — Re-Survey & Growth Comparison
**Session goal:** Participant runs a second RC round and sees before/after comparison

### Steps for Cursor

**10.1 Trigger re-survey**
```
Prompt: "Add 'Run new Reality Check' button to the plan page (visible when phase='post' and it's been 30+ days since last round):
- Button → calls API to create a new reality_check_rounds row (round_number++)
- Updates user_skills.phase = 'training'
- Navigates to chat to restart peer selection flow"
```

**10.2 Growth comparison view**
```
Prompt: "Build src/app/(app)/skills/[userSkillId]/growth/page.tsx:
1. Fetch all completed reality_check_rounds for this user_skill, ordered by round_number
2. For each dimension: show R1 vs R2 (vs R3 if exists) as grouped bars using recharts
3. Overall score trajectory line chart
4. Theme shift: which themes appeared/disappeared between rounds
5. 'Share progress' button generates a shareable card (use html2canvas or a server-side OG image)"
```

---

## PHASE 11 — SendGrid Email Integration
**Session goal:** All email features — account invites, peer invites, nudges, broadcasts

### Steps for Cursor

**11.1 SendGrid email service**
```
Prompt: "Create src/lib/email.ts:
1. sendEmail({ to, template, payload }) — calls SendGrid /mail/send API
2. Template IDs as constants: ACCOUNT_INVITE, PEER_INVITE, NUDGE_EMAIL, REMINDER
3. Each send inserts into email_log via service role client
4. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to .env.local.example
5. Gracefully handles SendGrid errors — never throws, just logs"
```

**11.2 Account invite emails**
```
Prompt: "Update HR and participant creation actions to send welcome emails:
1. After creating user, call sendEmail with account_invite template
2. Include: email, temporary password, login URL, org name
3. Add 'Resend invite' button to HR and Participant tables
4. resendWelcomeEmail action: regenerates password, sends email, updates plain_password"
```

**11.3 Peer invite emails**
```
Prompt: "Update reality-check/start API to send peer invite emails:
1. For each peer_invite created, call sendEmail with peer_invite template
2. Include: peer name, participant name (first name only), skill name, survey URL with token
3. Add reminder capability: button in participant's RC status view to resend"
```

**11.4 Nudge email cron**
```
Prompt: "Create supabase/functions/nudge-cron/index.ts (Supabase Edge Function):
1. Runs daily at 9am per user's timezone (use users.timezone or default UTC)
2. Finds participants with pending actions and no activity in the last nudge_cadence days
3. For each, sends a nudge email via SendGrid with:
   - The next pending action title
   - A motivational message
   - Deep link to /app/skills/[userSkillId]/plan
4. Updates email_log
5. Deploy with: supabase functions deploy nudge-cron
6. Schedule with pg_cron in a migration"
```

---

## PHASE 12 — HR Insights Dashboard (Full)
**Session goal:** HR dashboard fully matches the HTML prototype with live data

### Steps for Cursor

**12.1 Nightly insights cron**
```
Prompt: "Create supabase/functions/generate-insights/index.ts:
1. Runs nightly at 2am UTC
2. For each org × skill combination with activity:
   a. Count conversations, unique users, messages
   b. Pull all peer comments from the last 30 days
   c. Call LLM: 'Cluster these comments into 3-5 themes. For each theme provide name, volume count, 2 sample questions. Also write 1 recommended HR action. Return JSON.'
   d. Compute avg_peer_score from user_skills.current_peer
   e. Upsert into skill_insights
3. Log to llm_usage (feature='insights')"
```

**12.2 Skill insights drill-down**
```
Prompt: "Build src/app/(hr)/insights/[skillId]/page.tsx:
1. Fetches skill_insights for this skill + all participants enrolled in this skill (with scores)
2. Table: participant name, round, baseline, current, growth delta, last active
3. Sortable columns
4. Group filter (from HR's groups)
5. Export CSV button — generates CSV of the visible rows"
```

**12.3 HR broadcast messaging**
```
Prompt: "Build src/app/(hr)/settings/broadcast/page.tsx:
1. Rich text message area (markdown supported)
2. Recipient selector: all org / specific group / specific participants
3. Send as: in-app notification only / email only / both
4. Preview button
5. Send → inserts into a notifications table, calls SendGrid for email variant
6. Sent broadcasts history table"
```

---

## PHASE 13 — Knowledge Base (RAG)
**Session goal:** Chatbot cites curated KB content in coaching responses

### Steps for Cursor

**13.1 KB upload UI (Super Admin)**
```
Prompt: "Build src/app/(super-admin)/kb/page.tsx:
1. Upload PDF or DOCX → upload to Supabase Storage bucket 'knowledge-base'
2. Or paste a URL → scrape with cheerio/fetch
3. Tag by skill (multi-select)
4. After upload, call /api/kb/process to chunk + embed
5. Status column: pending / processing / ready / error"
```

**13.2 KB processing API**
```
Prompt: "Create src/app/api/kb/process/route.ts:
1. Download file from Storage or fetch URL content
2. Split into ~500-token chunks with overlap using a simple splitter
3. For each chunk: call OpenAI/Anthropic embeddings API to get 1536-dim vector
4. Insert into kb_chunks table: { kb_document_id, content, embedding, skill_tags }
5. Add table to migration: kb_chunks (id, kb_document_id, content text, embedding vector(1536), skill_tags uuid[])
6. Create ivfflat index on embedding vector_cosine_ops"
```

**13.3 RAG retrieval in chat**
```
Prompt: "Update src/app/api/chat/route.ts to add RAG:
1. Before generating a response, call a retrieveContext() function
2. retrieveContext(message, skillId, orgId):
   a. Embed the user message
   b. SELECT content FROM kb_chunks WHERE skill_tags @> ARRAY[skillId] ORDER BY embedding <=> query_embedding LIMIT 3
   c. Return top-3 chunk contents
3. Inject into system prompt: 'Relevant coaching resources:\n{chunks}'
4. Only inject if chunks are found and cosine similarity > 0.75"
```

---

## PHASE 14 — Community Rooms (Optional)
**Session goal:** Basic skill rooms with posts and reactions

### Steps for Cursor

**14.1 Community page**
```
Prompt: "Build src/app/(app)/community/page.tsx:
1. List of skill rooms (one per skill the org has enabled)
2. Each room shows: skill name, icon, recent post count, members
3. Click → /app/community/[skillId]"
```

**14.2 Skill room**
```
Prompt: "Build src/app/(app)/community/[skillId]/page.tsx:
1. Post feed: author emoji/color, anonymized name (e.g. 'Purple Penguin'), time, body
2. Cheer reaction (like) with count
3. Comment thread (collapsible)
4. New post form at top: 250-char limit, submit posts anonymously by default
5. Report post button → sets is_reported=true, sends notification to HR"
```

---

## PHASE 15 — Billing, Observability, Polish
**Session goal:** Stripe, error tracking, analytics, accessibility

### Steps for Cursor

**15.1 Stripe integration**
```
Prompt: "Integrate Stripe for plan upgrades:
1. src/app/api/billing/checkout/route.ts — creates Stripe Checkout session
2. src/app/api/billing/webhook/route.ts — handles checkout.session.completed → updates org.plan
3. src/app/(hr)/settings/billing/page.tsx — shows current plan, usage, upgrade button, invoice list
4. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET to .env.local.example"
```

**15.2 Error tracking + analytics**
```
Prompt: "Add observability:
1. Install @sentry/nextjs, run npx @sentry/wizard@latest -i nextjs
2. Wrap all API routes and server actions with Sentry.captureException on catch
3. Install posthog-js, create src/lib/analytics.ts with track() and identify() helpers
4. Track key events: skill_enrolled, chat_message_sent, rc_round_started, action_completed
5. Add SENTRY_DSN and NEXT_PUBLIC_POSTHOG_KEY to .env.local.example"
```

**15.3 Accessibility audit**
```
Prompt: "Do an accessibility pass on all pages:
1. Add aria-labels to all icon-only buttons
2. Ensure all form inputs have associated labels
3. Add focus-visible styles (currently missing from some buttons)
4. Add skip-to-content link in root layout
5. Verify color contrast on brand-yellow buttons (should be dark text)
6. Test keyboard navigation through sidebar"
```

**15.4 Dark mode**
```
Prompt: "Add dark mode support:
1. Extend tailwind.config.ts colors with dark mode variants using CSS variables
2. Add a ThemeToggle component to all topbars
3. Persist preference in localStorage
4. Ensure sidebar (already dark) looks correct in both modes
5. The brand-cream background becomes #1A1A1A in dark mode"
```

---

## PHASE 16 — Launch Prep
**Session goal:** Production-ready

### Steps for Cursor

**16.1 GDPR endpoints**
```
Prompt: "Build GDPR compliance endpoints:
1. GET /api/gdpr/export — returns all user data as JSON (messages, skills, actions, intel)
2. DELETE /api/gdpr/delete — soft-deletes user, anonymizes messages, removes PII
3. Add 'Export my data' and 'Delete my account' to participant settings page
4. Both require re-authentication (prompt for password before proceeding)"
```

**16.2 Load testing**
```
Prompt: "Write a k6 load test script tests/load/chat.js:
1. 50 virtual users
2. Each: login → start chat → send 5 messages with 2s delay
3. Assert p95 response time < 3s for auth, < 8s for chat (streaming)
4. Test the peer-survey page separately (no auth) with 200 VUs
5. Run with: k6 run tests/load/chat.js"
```

**16.3 Security headers**
```
Prompt: "Add security hardening:
1. Add security headers to next.config.ts: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
2. Add rate limiting middleware for /api/chat (10 req/min per user) and /peer-survey (1 req/token)
3. Add input sanitization for all text fields stored in DB (use DOMPurify for client, strip HTML on server)
4. Ensure ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY are never exposed to client"
```

**16.4 PWA setup**
```
Prompt: "Configure PWA:
1. Create public/manifest.json with Nudgeable branding (name, icons, theme_color=#FFCE00)
2. Add next-pwa to next.config.ts
3. Generate icon set (192x192, 512x512) from the N logo
4. Add 'Add to Home Screen' prompt component shown after 3rd session
5. Test install flow on mobile Chrome and Safari"
```

---

## Cross-Cutting Cursor Prompts

### Add a new page (generic template)
```
"Add a new page at [route]:
- Server Component that fetches [data] from Supabase using createClient() from server.ts
- Uses [role] layout (already wraps with sidebar)
- Use Topbar component with title '[Title]'
- Main content in a scrollable div with p-6
- Follow existing brand patterns (nudge-card, brand colors, font sizes)"
```

### Add a server action
```
"Add a server action src/app/[route]/actions.ts:
- 'use server' directive at top
- Use createServiceClient() for writes that need to bypass RLS
- Validate input with zod
- Write to audit_log on every mutation (use insertAuditLog helper)
- Return { success: boolean, error?: string }
- Never expose plain_password in return values"
```

### Add a data table
```
"Add a data table component at src/components/[area]/[Name]Table.tsx:
- Client component with useState for search/filter
- Follows ParticipantsTable pattern
- Columns: [list columns]
- Action column with [list actions]
- Empty state with helpful message
- Loading skeleton (use skeleton CSS class)"
```

### Fix a Supabase type error
```
"The Supabase query at [file] is returning type errors.
Run: npm run db:types to regenerate src/lib/types/database.ts
Then update the query to use the correct generated types.
Use the pattern: supabase.from('table').select('*').returns<Type[]>()"
```

---

## Environment Variables Reference

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ANTHROPIC_API_KEY=sk-ant-...
# or: OPENAI_API_KEY=sk-...

SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@nudgeable.ai

# Phase 13+
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...

APP_URL=http://localhost:3000
```

---

## File Structure Reference

```
nudgeable-web/
├── src/
│   ├── app/
│   │   ├── (auth)/           login, forgot-password, reset-password
│   │   ├── (super-admin)/    orgs, skills, prompts, billing, flags, audit, llm, kb
│   │   ├── (hr)/             insights, participants, groups, skills, settings
│   │   ├── (app)/            skills, plan, progress, community
│   │   ├── api/
│   │   │   ├── chat/         route.ts — streaming AI coach
│   │   │   ├── reality-check/ start, close routes
│   │   │   ├── action-plan/  generate route
│   │   │   ├── kb/           process route
│   │   │   └── billing/      checkout, webhook routes
│   │   ├── peer-survey/[token]/  public, no auth
│   │   └── change-password/
│   ├── components/
│   │   ├── layout/           AppSidebar, HRSidebar, SuperAdminSidebar, Topbar
│   │   ├── chat/             ChatWindow, PeerSelectForm, SelfRatingForm
│   │   ├── skills/           SkillsGrid, SkillCard
│   │   ├── hr/               HRInsightsDashboard, ParticipantsTable, AddParticipantModal
│   │   ├── super-admin/      CreateOrgModal, PromptEditor
│   │   └── shared/           NudgeCard, Toast, Modal, Skeleton
│   ├── lib/
│   │   ├── supabase/         client.ts, server.ts
│   │   ├── hooks/            useUser.ts, useSkills.ts
│   │   ├── utils/            cn.ts, formatters.ts
│   │   └── types/            index.ts, database.ts (generated)
│   └── styles/               globals.css
├── supabase/
│   ├── migrations/           0001_init.sql, 0002_kb.sql, ...
│   ├── functions/            nudge-cron, generate-insights
│   └── seed.sql
├── scripts/                  create-demo-users.ts, db-setup.sh
├── tests/                    rls.test.ts, load/chat.js
├── middleware.ts
├── tailwind.config.ts
└── next.config.ts
```

---

## Completed (Base Setup ✅)

- [x] Project structure + package.json
- [x] Tailwind config with brand tokens
- [x] globals.css with design system
- [x] TypeScript types (src/lib/types/index.ts)
- [x] Supabase client + server helpers
- [x] Middleware with role-based routing
- [x] Auth layout + Login page
- [x] App/HR/SuperAdmin layouts with sidebars
- [x] AppSidebar (XP ring, streak, phase tracker)
- [x] HRSidebar + SuperAdminSidebar
- [x] Topbar component
- [x] Participant Skills page + SkillsGrid
- [x] ChatWindow with streaming + phase-aware prompts
- [x] Chat API route (/api/chat) with Anthropic streaming + LLM logging
- [x] HR Insights Dashboard (KPIs, skill cards, charts, people table)
- [x] HR Participants page + ParticipantsTable
- [x] Super Admin Orgs page
- [x] DB Migration 0001_init.sql (full schema + RLS)
- [x] Seed SQL (org + 6 platform skills)

## Completed (PHASE 1 — Supabase Setup & Seed ✅)

- [x] scripts/db-setup.sh + db-setup.ps1 (cross-platform DB setup scripts)
- [x] scripts/create-demo-users.ts (creates super admin, HR, 5 participants with skills)
- [x] src/lib/types/database.ts (Supabase generated types)
- [x] Updated index.ts to re-export database types
- [x] tests/rls.test.ts (RLS verification for all 3 roles)
- [x] npm scripts: db:setup, db:seed-users, test:rls

## Completed (PHASE 2 — Auth Flows ✅)

- [x] Removed "Forgot password" link from login (HR manages passwords)
- [x] Updated middleware public routes
- [x] src/app/change-password/page.tsx (force password change when must_change_pw=true)
- [x] src/lib/hooks/useUser.ts (React Query-based user hook with role helpers)
- [x] src/components/providers/QueryProvider.tsx (React Query setup)
- [x] src/components/providers/SessionRefresh.tsx (auth state change listener)
- [x] Updated root layout with Providers wrapper

## Completed (PHASE 3 — Participant Skills UI ✅)

- [x] src/app/(app)/skills/[skillId]/page.tsx (skill detail/preview page)
- [x] src/components/skills/SkillPreview.tsx (dimensions accordion, enrollment CTA)
- [x] src/app/(app)/skills/actions.ts (enrollInSkill server action with audit log)
- [x] src/app/(app)/skills/[userSkillId]/layout.tsx (tabs layout with header)
- [x] src/components/skills/SkillTabs.tsx (Chat/Plan/Progress/Intel navigation)
- [x] src/app/(app)/skills/[userSkillId]/plan/page.tsx (action plan placeholder)
- [x] src/app/(app)/skills/[userSkillId]/progress/page.tsx (growth view placeholder)
- [x] src/app/(app)/skills/[userSkillId]/intel/page.tsx (AI intel viewer)
- [x] Updated SkillsGrid to link to skill detail page for available skills

## Completed (PHASE 4 — Super Admin: Org & HR Provisioning ✅)

- [x] src/app/(super-admin)/orgs/actions.ts (createOrg, updateOrg, suspendOrg, reactivateOrg)
- [x] src/components/super-admin/CreateOrgModal.tsx (dark modal with auto-slug)
- [x] src/app/(super-admin)/orgs/OrgsTable.tsx (client component with actions)
- [x] src/app/(super-admin)/orgs/[id]/page.tsx (org detail with stats)
- [x] src/app/(super-admin)/orgs/[id]/hr/page.tsx (HR management page)
- [x] src/app/(super-admin)/orgs/[id]/hr/actions.ts (createHR, resetHRPassword, deactivateHR, reactivateHR)
- [x] src/app/(super-admin)/orgs/[id]/hr/HRManagement.tsx (table with credentials modal)
