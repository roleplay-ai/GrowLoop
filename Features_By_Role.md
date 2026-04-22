# Nudgeable — Features By Role (SaaS V1)

Stack: Next.js (App Router) + Supabase (Postgres + Auth) + SendGrid + pgvector + OpenAI/Claude for chatbot.

Three roles: **Super Admin** (Nudgeable internal), **HR** (customer admin), **Participant** (end user / employee).

---

## 1. Super Admin (Nudgeable internal)

Scope: runs the whole SaaS platform across all customer organizations.

### 1.1 Auth & Account
- Login with email + password (Supabase Auth).
- Forgot password / reset password flow.
- Session persistence; logout.
- 2FA (TOTP) optional toggle.
- Role guard — routes under `/super-admin/*` accessible only if `users.role = 'super_admin'`.

### 1.2 Organizations (Tenants)
- List all organizations with search, filter (plan, status, created date), sort.
- Create new organization: name, domain, logo, plan tier (free / pro / enterprise), seat limit, status.
- Edit organization details.
- Suspend / reactivate organization (cascades to block all users in that org).
- Delete organization (soft delete; hard delete behind confirmation).
- View per-org usage: active users, skills built, RC rounds run, emails sent, LLM tokens consumed.
- Impersonate an HR user of any org (read-only mode by default; toggle write mode with audit log entry).

### 1.3 HR Account Provisioning
- Create HR user inside any organization: first name, last name, email, auto-generated password.
- System sends welcome email via SendGrid with login URL + email + plain-text password.
- Resend welcome email.
- Reset HR password (regenerates + resends).
- Deactivate / reactivate HR user.
- View list of all HRs across all orgs.

### 1.4 Platform Skills Library
- Global skills catalog (visible to all orgs unless overridden).
- Create / edit / archive skills with: name, category, description, default rubric, suggested actions, KB tags.
- Clone a skill into a specific org's library.
- Import skills from CSV.

### 1.5 Prompt & Agent Management
- Manage system prompts for each chatbot phase (onboarding, reality check, action plan, nudging, re-survey).
- Version prompts; roll back to prior versions.
- Per-org prompt overrides (enterprise plan).
- Test harness: run a prompt against a seeded user profile and view response.

### 1.6 Knowledge Base (Global)
- Upload PDFs, DOCX, web links into the global KB.
- Tag documents by skill.
- Re-index / re-chunk / re-embed.
- View KB chunks and embeddings status.

### 1.7 Billing & Plans
- Define plan tiers with seat limits, feature flags, pricing.
- Assign / change plan for an org.
- View invoices (Stripe integration — read-only in V1).
- Manual billing overrides (credits, comps).

### 1.8 Email Templates
- Manage SendGrid templates (account invite, peer invite, nudge email, reminder).
- Per-org template override (enterprise).
- Test-send to any email.

### 1.9 Feature Flags
- Global feature flags with per-org overrides.
- Enable/disable experimental features (e.g., new agent version, community rooms).

### 1.10 Observability & Audit
- Audit log viewer (global + per-org, filter by actor/action/entity).
- Email log: every SendGrid event (delivered, opened, bounced, failed).
- LLM usage dashboard: tokens, cost, per-org breakdown.
- Error log (server + client).
- System health: Supabase connection, SendGrid quota, OpenAI/Claude API status.

### 1.11 Analytics (Platform-wide)
- Active orgs, active users, MAU/WAU, RC rounds completed, skills per user, average growth score.
- Funnel: HR invite sent → HR activated → participants invited → participants activated → first RC complete.
- Retention cohort analysis.
- Export CSV.

### 1.12 Support Tools
- Search any user by email across all orgs.
- View user's profile, skills, conversations (with consent flag).
- Manual user unlock / password reset.

---

## 2. HR (Customer Admin)

Scope: manages their own organization — participants, groups, skills, insights.

### 2.1 Auth & Account
- Login with email + password (credentials received via welcome email).
- Forced password change on first login (optional toggle — default ON).
- Forgot / reset password.
- Update own profile (name, phone, avatar).
- Logout.

### 2.2 Onboarding
- First-login welcome tour.
- Step 1: set org defaults (logo, default nudge cadence, work hours).
- Step 2: invite first participants (single or CSV).
- Step 3: pick default skills library.

### 2.3 Participant Management
- List participants in own org: name, email, skills count, last active, status.
- Add single participant: name, email, group, role/title — auto-generates password + sends email.
- Bulk import participants via CSV (name, email, group, role).
- Edit participant profile.
- Deactivate / reactivate participant.
- Resend welcome email.
- Reset participant password.
- Delete participant (soft).
- Move participant between groups.

### 2.4 Groups / Teams
- Create group (e.g., "Sales EMEA", "Leadership Cohort 2026").
- Assign participants to groups (many-to-many).
- Group-level analytics.
- Tag groups with a program name.

### 2.5 Skills Library (Org)
- View global skills catalog.
- Clone a global skill into the org library to customize.
- Create custom skills: name, description, rubric, starter actions.
- Enable / disable skills for the org.
- Recommend / feature certain skills to participants.

### 2.6 Reality Check Management
- View all active RC rounds across participants.
- View RC completion rate per skill, per group.
- Manually close / reopen a round.
- Nudge participants with pending peer invites (bulk reminder email).
- View aggregate peer rating distributions.

### 2.7 HR Insights Dashboard
- **Org-level KPIs:** participants activated, skills in progress, average growth score, nudge completion rate.
- **Skill cards grid:** each card shows summary stat, 6-month bar chart of avg peer score, top behavioural themes, AI-generated HR action.
- **Usage Health row:** active users, RC rounds completed, actions completed this week, peer responses collected.
- **Top scorers and Top growers** (independent lists per skill).
- **Drill-down:** click a skill → see participant-level table with growth deltas.
- **Group filter:** slice all views by group.
- **Date range filter.**
- **Export:** CSV + PDF snapshot.

### 2.8 Agent Intel
- Read-only aggregate view of what the chatbot has learned across participants (anonymized themes).
- Per-participant Agent Intel viewable only with participant consent toggle.

### 2.9 Communications
- Send broadcast announcements to own org (in-app + email).
- Configure default nudge cadence (daily / alt-day / weekly).
- Configure quiet hours.

### 2.10 Reports
- Monthly program report (PDF/DOCX) auto-generated.
- Custom report builder (pick metrics, groups, date range).
- Schedule email delivery of reports.

### 2.11 Billing (Self-serve)
- View current plan + seat usage.
- Upgrade/downgrade (redirects to Stripe Checkout).
- Download invoices.

### 2.12 Settings
- Org branding (logo, color).
- Email template overrides (if plan allows).
- SSO setup (enterprise).
- Data export + delete (GDPR).

---

## 3. Participant (Employee)

Scope: pick skills, interact with chatbot, run reality checks, complete nudges, re-assess.

### 3.1 Auth & Account
- Login with email + password (from welcome email).
- Forced password change on first login.
- Forgot password.
- Update profile (name, role, timezone, avatar, communication preferences).
- Logout.

### 3.2 Skill Discovery & Selection
- Browse skills catalog (org-enabled skills).
- Search / filter by category.
- View skill detail: description, why it matters, typical journey.
- Pick a skill to start building → creates `user_skills` row, phase = `onboarding`.
- Pin up to N active skills at a time (configurable per org).
- Pause / resume / drop a skill.

### 3.3 Chatbot (Core Experience)
- Conversational interface for each active skill.
- **Phase 1 — Onboarding:** chatbot asks open questions to capture current level, context, motivations → stored as Agent Intel.
- **Phase 2 — Reality Check setup:** chatbot helps user choose 3–8 peers (manager, reports, peers, cross-functional).
- **Phase 3 — Self-rating:** chatbot walks user through self-rating on the rubric.
- **Phase 4 — Results:** chatbot explains peer + self score, strengths, gaps.
- **Phase 5 — Action plan design:** chatbot co-creates a personalized action plan (3–7 actions).
- **Phase 6 — Execution & nudging:** daily/weekly check-ins, motivational nudges, reflection prompts.
- **Phase 7 — Re-survey:** user triggers another reality check; chatbot compares scores.
- Chatbot remembers context across sessions (Agent Intel).
- Chatbot can reference KB content (RAG) when giving advice.
- Voice input (optional).

### 3.4 Peer Invites
- Add peers with name, email, relationship (manager / report / peer / cross-fn).
- System sends peer invite email via SendGrid.
- Resend peer invite.
- See peer invite status (pending / opened / completed).
- Anonymity guarantee surfaced clearly.

### 3.5 Reality Check (Self view)
- See summary of each completed round: self score, peer avg, rubric breakdown, themes.
- Compare rounds over time (R1 vs R2 vs R3 …).
- See peer qualitative comments (anonymized, aggregated by theme).

### 3.6 Action Plan
- View current action plan per skill.
- Mark actions as done / skipped / in-progress.
- Add notes / reflections against each action.
- Request chatbot to adjust the plan.
- See completion streak.

### 3.7 Nudges & Reminders
- Receive in-app nudge cards.
- Receive email nudges per cadence.
- Snooze nudges for a day.
- Configure quiet hours.

### 3.8 Progress Dashboard
- Per-skill progress: current phase, score trajectory, actions completed, next step.
- Overall dashboard across all skills.
- Streaks and milestones.
- Shareable progress card (opt-in).

### 3.9 Community (optional V1)
- Skill rooms: join a room for a skill, see anonymized themes and tips from peers.
- Post a reflection; like / comment.
- Moderation queue handled by HR + Super Admin.

### 3.10 Notifications
- Peer completed your survey.
- New nudge available.
- Action plan updated.
- Re-survey window open.
- Weekly digest email.

### 3.11 Privacy & Data
- View own Agent Intel (what the bot has learned).
- Toggle to share Agent Intel with HR.
- Export own data (GDPR).
- Delete own account.

### 3.12 Help
- In-app help widget.
- FAQ + chatbot for product questions.
- Contact HR.

---

## 4. Shared / Cross-Role

- Responsive web app (desktop + mobile web).
- PWA install prompt.
- Dark mode.
- Accessibility (WCAG AA).
- Internationalization ready (English V1).
- Consistent audit log for any destructive action.
- Rate limiting on public endpoints.
- Email delivery guaranteed via SendGrid with event tracking (sent / delivered / opened / bounced).
