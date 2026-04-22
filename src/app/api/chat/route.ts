// src/app/api/chat/route.ts
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PHASE_PROMPTS: Record<string, string> = {
  pre: `You are Nudge, an empathetic AI skill coach on the Nudgeable platform.
Your goal is to understand the participant's CURRENT level, context, and motivations for this skill.
Ask open-ended questions. Be warm and curious — not clinical. After 5-8 turns, summarize what you've learned.
Do NOT give advice yet. Focus entirely on listening and understanding.`,

  training: `You are Nudge, an AI skill coach helping a participant complete their Reality Check.
Guide them through: (1) choosing 3-5 peers to survey, (2) doing a self-rating on each dimension.
Be supportive. Explain that peer feedback is anonymous and constructive.`,

  post: `You are Nudge, an AI skill coach reviewing Reality Check results.
Explain the scores clearly. Highlight strengths first, then growth areas.
Co-create a realistic action plan (3-7 actions) based on the gap between self and peer scores.
Be encouraging and specific.`,
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { userSkillId, conversationId, phase, skillName, message, history } = await req.json()

    // Fetch Agent Intel for context
    const { data: intel } = await supabase
      .from('agent_intel')
      .select('current_level, context, motivations, blockers')
      .eq('user_id', user.id)
      .eq('skill_id', userSkillId)
      .maybeSingle()

    const systemPrompt = [
      PHASE_PROMPTS[phase] ?? PHASE_PROMPTS.pre,
      `\nSkill being coached: ${skillName}`,
      intel?.current_level ? `\nParticipant's known level: ${intel.current_level}` : '',
      intel?.motivations?.length ? `\nMotivations: ${intel.motivations.join(', ')}` : '',
      intel?.blockers?.length ? `\nKnown blockers: ${intel.blockers.join(', ')}` : '',
      '\nKeep responses concise (2-4 paragraphs max). Use a conversational tone. No bullet lists unless listing action steps.',
    ].join('')

    // Build message history (last 10 turns)
    const recentHistory = (history ?? []).slice(-10)
    const messages = [
      ...recentHistory,
      { role: 'user' as const, content: message },
    ]

    // Stream response
    const stream = await anthropic.messages.stream({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      system:     systemPrompt,
      messages,
    })

    // Log LLM usage after stream completes (fire and forget)
    stream.finalMessage().then(async finalMsg => {
      const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
      await supabase.from('llm_usage').insert({
        org_id:     profile?.org_id,
        user_id:    user.id,
        model:      'claude-sonnet-4-20250514',
        tokens_in:  finalMsg.usage.input_tokens,
        tokens_out: finalMsg.usage.output_tokens,
        cost_cents: ((finalMsg.usage.input_tokens * 0.003 + finalMsg.usage.output_tokens * 0.015) / 1000).toFixed(4),
        feature:    'coach',
      })
    }).catch(console.error)

    // Return streaming text
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[/api/chat]', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
