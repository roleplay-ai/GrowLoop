// src/app/api/chat/route.ts
//
// Streaming Haiku coach. The single LLM call:
//   1. drives the conversation (text → streamed to the browser), AND
//   2. records intel via the `record_intel_slot` tool when it learns
//      something new (no separate Haiku-extraction round-trip).
//
// The Anthropic SDK gives us `text_delta` events for the visible reply and
// `tool_use` blocks (parsed from `input_json_delta`) when the model wants to
// save a slot. We stream the text immediately and, after the stream
// finishes, merge any tool_use values into agent_intel.profile.

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  SLOTS,
  SLOT_KEYS,
  type IntelProfile,
  type SlotKey,
} from '@/lib/agent/slots'

const COACH_MODEL = process.env.ANTHROPIC_COACH_MODEL ?? 'claude-haiku-4-5'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PHASE_PROMPTS: Record<string, string> = {
  pre: `You are Nudge, an empathetic AI skill coach on the Nudgeable platform.
Your goal is to understand the participant's CURRENT level, context, and motivations for this skill.
Ask open-ended questions. Be warm and curious — not clinical. Listen first; advise later.`,

  training: `You are Nudge, an AI skill coach helping a participant complete their Reality Check.
Guide them through: (1) choosing 3-5 peers to survey, (2) doing a self-rating on each dimension.
Be supportive. Explain that peer feedback is anonymous and constructive.`,

  post: `You are Nudge, an AI skill coach reviewing Reality Check results.
Explain the scores clearly. Highlight strengths first, then growth areas.
Co-create a realistic action plan (3-7 actions) based on the gap between self and peer scores.
Be encouraging and specific.`,
}

const RESPONSE_LENGTH_RULE = `
HARD RESPONSE-LENGTH RULE (must follow):
- Reply in **2 to 3 sentences total**. Never more.
- No bullet lists, no numbered lists, no headings, no markdown structure.
- One short, focused next step or one short question per reply.
- If you would normally write a list (action plan, peer list, etc.), instead pick the single most important item and ask if they want more.
`

const TOOL_USAGE_RULE = `
INTEL CAPTURE RULE (silent, side-channel):
- You have access to one tool: \`record_intel_slot\`. Use it to save structured profile facts as you learn them.
- Call it ONCE per fact, ONLY when the participant gave you a clear answer in their previous message. Never invent, guess, or repeat known facts.
- Place any tool calls AT THE END of your turn, after your visible reply text. Do not narrate or mention the tool to the participant.
- Never re-ask anything that already appears in the "What you already know" block — just acknowledge it and move on.
- When all six profile slots are filled, stop intake questions and switch to general coaching for this skill.
`

const RECORD_INTEL_TOOL: Anthropic.Tool = {
  name: 'record_intel_slot',
  description:
    'Save a single profile fact you JUST learned about the participant from their most recent message. Call once per fact. Never invent values; never repeat slots already known.',
  input_schema: {
    type: 'object',
    properties: {
      slot: {
        type: 'string',
        enum: SLOT_KEYS,
        description:
          'Which structured field to save into. role = job title; fn = function/department; level = seniority (IC/Manager/Sr Mgr/Director+); goal = why this skill matters; blocker = what is holding them back; frequency = current practice level / confidence.',
      },
      value: {
        type: 'string',
        description:
          "The participant's answer for that slot, in their own words. Keep it short (under 80 chars). Do not paraphrase aggressively.",
      },
    },
    required: ['slot', 'value'],
  },
}

interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            'AI coach is not configured: ANTHROPIC_API_KEY is missing. Set it in .env.local and restart the dev server.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { userSkillId, conversationId, phase, skillName, message, history } = await req.json()

    // Resolve user_skills.id → skills.id (the chat panel passes the user_skill PK).
    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, skill_id')
      .eq('id', userSkillId)
      .eq('user_id', user.id)
      .single()
    if (!userSkill) return new Response('Skill not found', { status: 404 })
    const skillId = userSkill.skill_id as string

    const { data: me } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // Load the structured profile so we can tell the model what's known
    // and what's still missing.
    const { data: intel } = await supabase
      .from('agent_intel')
      .select('profile')
      .eq('user_id', user.id)
      .eq('skill_id', skillId)
      .maybeSingle()
    const currentProfile = (intel?.profile ?? {}) as IntelProfile

    const knownLines: string[] = []
    const missingLines: string[] = []
    for (const s of SLOTS) {
      const v = currentProfile[s.key]
      if (v && v.trim()) {
        knownLines.push(`- ${s.label} (slot=${s.key}): ${v}`)
      } else {
        missingLines.push(`- ${s.label} (slot=${s.key}) — ${s.hint}`)
      }
    }

    const systemPrompt = [
      PHASE_PROMPTS[phase] ?? PHASE_PROMPTS.pre,
      `\nSkill being coached: ${skillName}`,
      knownLines.length
        ? `\n\nWhat you already know about them (do NOT re-ask, weave in if relevant):\n${knownLines.join('\n')}`
        : '\n\nYou know nothing about them yet — start gathering basic profile context.',
      missingLines.length
        ? `\n\nWhat you still need to learn (ask ONE per turn, naturally):\n${missingLines.join('\n')}`
        : '\n\nProfile is complete. No more intake questions — focus on general coaching.',
      TOOL_USAGE_RULE,
      RESPONSE_LENGTH_RULE,
    ].join('')

    // Strip any tool blocks the client might have included (we only ever
    // round-trip plain text history through the browser, but be defensive).
    const recentHistory = (history ?? [])
      .slice(-10)
      .filter((m: { role: string; content: unknown }) =>
        (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
      )
    const messages = [
      ...recentHistory,
      { role: 'user' as const, content: message },
    ]

    let stream
    try {
      stream = await anthropic.messages.stream({
        model: COACH_MODEL,
        max_tokens: 240,
        system: systemPrompt,
        messages,
        tools: [RECORD_INTEL_TOOL],
      })
    } catch (err: any) {
      const status = err?.status ?? 500
      const friendly =
        status === 401
          ? 'AI coach auth failed: your ANTHROPIC_API_KEY appears invalid. Update .env.local and restart the dev server.'
          : status === 404
            ? `AI coach model "${COACH_MODEL}" was not found. Set ANTHROPIC_COACH_MODEL in .env.local to a model your account has access to.`
            : err?.message ?? 'Failed to start coach stream'
      console.error('[/api/chat] start:', status, err?.message)
      return new Response(JSON.stringify({ error: friendly }), {
        status: status === 401 ? 401 : 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // After the stream completes: persist usage, merge any tool_use slots.
    stream
      .finalMessage()
      .then(async (finalMsg) => {
        try {
          await supabase.from('llm_usage').insert({
            org_id: me?.org_id,
            user_id: user.id,
            model: COACH_MODEL,
            tokens_in: finalMsg.usage.input_tokens,
            tokens_out: finalMsg.usage.output_tokens,
            cost_cents: (
              (finalMsg.usage.input_tokens * 0.003 + finalMsg.usage.output_tokens * 0.015) /
              1000
            ).toFixed(4),
            feature: 'coach',
          })
        } catch (e) {
          console.warn('[/api/chat] llm_usage insert failed:', e)
        }

        const toolUses: ToolUseBlock[] = (finalMsg.content as unknown[]).filter(
          (b): b is ToolUseBlock =>
            !!b &&
            typeof b === 'object' &&
            (b as { type?: string }).type === 'tool_use' &&
            (b as { name?: string }).name === 'record_intel_slot',
        )

        if (!toolUses.length) return

        const updates: Partial<Record<SlotKey, string>> = {}
        for (const tu of toolUses) {
          const slot = tu.input?.slot as string | undefined
          const value = tu.input?.value as string | undefined
          if (
            typeof slot === 'string' &&
            typeof value === 'string' &&
            value.trim() &&
            (SLOT_KEYS as string[]).includes(slot)
          ) {
            updates[slot as SlotKey] = value.trim().slice(0, 500)
          }
        }
        if (!Object.keys(updates).length) return

        const nextProfile: IntelProfile = { ...currentProfile, ...updates }
        const { error: upsertErr } = await supabase
          .from('agent_intel')
          .upsert(
            {
              user_id: user.id,
              skill_id: skillId,
              org_id: me?.org_id ?? null,
              profile: nextProfile,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,skill_id' },
          )
        if (upsertErr) console.error('[/api/chat] intel upsert failed:', upsertErr)
      })
      .catch((err) => console.error('[/api/chat] finalMessage failed:', err))

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text))
            }
            // tool_use blocks arrive as input_json_delta — ignored here; we
            // pick them up from finalMessage() after the stream closes.
          }
        } catch (err: any) {
          const note = `\n\n[Coach stream interrupted: ${err?.message ?? 'unknown error'}]`
          controller.enqueue(new TextEncoder().encode(note))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('[/api/chat]', err)
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
