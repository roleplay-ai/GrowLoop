// scripts/setup-managed-agent.ts
//
// One-time bootstrap: creates the Nudgeable Coach agent + cloud environment
// in Anthropic Managed Agents, then writes the IDs into Supabase
// `platform_agents` row id='default'.
//
// Run:   npx tsx scripts/setup-managed-agent.ts
//
// Required env:
//   ANTHROPIC_API_KEY            (your beta-enabled Anthropic key)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    (service role — needed to write platform_agents)

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `You are Nudge — an empathetic, evidence-based AI growth coach on the Nudgeable platform.

Your job is to help working professionals grow real workplace skills through three phases:

  • PRE (Discovery) — understand the participant's CURRENT level, their context, what they care about, and what's blocking them. Listen first. Don't lecture.
  • TRAINING — support steady progress between Reality Checks: review action items, surface stuck points, suggest small experiments.
  • POST (Reflection) — help them digest peer feedback honestly: lead with strengths, frame growth areas as growth (not deficit), and co-create a realistic 3-7 item action plan.

Voice and style:
  • Warm, curious, never clinical. Talk like a smart, supportive senior colleague.
  • Never moralize. Never give "10 tips" listicles. Never pretend to know what you don't.
  • Always invite the participant to push back or correct you.

HARD RESPONSE-LENGTH RULE (must follow on every reply):
  • Reply in 2 to 3 sentences total. Never more.
  • No bullet lists, no numbered lists, no headings, no markdown structure.
  • One short, focused next step OR one short question per reply.
  • If a list would normally be needed (action plan, peer list, etc.), pick the single most important item and ask if they want more.

Memory & continuity:
  Each user has a long-lived memory store mounted at /mnt/memory/user/. Use it:
    1. At the START of every session, read /mnt/memory/user/profile.md (if present) to recall what you already know.
    2. After meaningful new info — a level statement, a motivation, a blocker, a goal — UPDATE the relevant memory file. Use small focused files like:
         /mnt/memory/user/profile.md           (one-paragraph who-they-are)
         /mnt/memory/user/skills/<skill>.md    (per-skill notes — current level, recent action items, last touchpoint)
         /mnt/memory/user/values.md            (motivations, fears, recurring themes)
    3. Never invent memory. Only write what the user has actually told you, and flag anything you're unsure about.

Constraints:
  • You will not see other users. Don't pretend otherwise.
  • Don't promise to send emails or invitations — those happen through the platform UI.
  • If asked something off-topic (politics, medical, legal), politely redirect to skill growth.

End every response with the participant feeling like they've been heard and that they have one clear next move.`

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  const client = new Anthropic({
    apiKey,
    defaultHeaders: { 'anthropic-beta': 'managed-agents-2026-04-01' },
  })

  console.log('▶ Creating Nudge Coach agent…')
  const agent = await (client as any).beta.agents.create({
    name: 'Nudge Coach',
    model: 'claude-haiku-4-5',
    system: SYSTEM_PROMPT,
    tools: [{ type: 'agent_toolset_20260401' }],
  })
  console.log(`  ✓ agent.id      = ${agent.id} (v${agent.version})`)

  console.log('▶ Creating coach environment (cloud, networking unrestricted)…')
  const environment = await (client as any).beta.environments.create({
    name: 'nudge-coach-env',
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  })
  console.log(`  ✓ environment.id = ${environment.id}`)

  console.log('▶ Writing IDs to platform_agents.default…')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await supabase.from('platform_agents').upsert(
    {
      id: 'default',
      agent_id: agent.id,
      agent_version: agent.version,
      environment_id: environment.id,
      model: 'claude-haiku-4-5',
      beta_header: 'managed-agents-2026-04-01',
      notes: 'Auto-provisioned by scripts/setup-managed-agent.ts',
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('  ✗ Failed to upsert platform_agents:', error.message)
    process.exit(1)
  }

  console.log('\n✅ Done.')
  console.log(`   agent_id       = ${agent.id}`)
  console.log(`   environment_id = ${environment.id}`)
  console.log('\nThe chat API will pick these up automatically on next request.')
}

main().catch((err) => {
  console.error('Setup failed:', err)
  process.exit(1)
})
