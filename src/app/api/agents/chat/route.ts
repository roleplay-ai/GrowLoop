// src/app/api/agents/chat/route.ts
//
// Chat over the Anthropic Managed Agents API.
//   * Resolves the platform Agent + Environment from the platform_agents table
//   * Lazily provisions a per-user memory store
//   * Lazily creates a Session bound to (agent, env, user-memory)
//   * Streams normalised JSONL events back to the browser
//
// Falls back to the legacy /api/chat behaviour if the platform agent
// hasn't been provisioned yet.

import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createCoachSession,
  createUserMemoryStore,
  streamUserMessage,
  type NormalisedEvent,
} from '@/lib/anthropic/managedAgents'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatBody {
  userSkillId: string
  conversationId: string
  phase: 'pre' | 'training' | 'post'
  skillName: string
  message: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const body = (await req.json()) as ChatBody

    // 1. Look up the platform agent + environment
    const { data: platform } = await supabase
      .from('platform_agents')
      .select('agent_id, environment_id')
      .eq('id', 'default')
      .maybeSingle()

    if (!platform?.agent_id || !platform?.environment_id) {
      return new Response(
        JSON.stringify({
          error:
            'Managed Agent not configured. Run `npm run agent:setup` to provision the platform agent.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 2. Ensure the user has a memory store (service role: bypass RLS for write)
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, memory_store_id')
      .eq('id', user.id)
      .single()

    let memoryStoreId = profile?.memory_store_id ?? null
    if (!memoryStoreId) {
      memoryStoreId = await createUserMemoryStore({
        userName: profile?.name ?? user.email ?? 'Participant',
        userEmail: profile?.email ?? user.email ?? 'unknown',
      })
      const service = await createServiceClient()
      await service
        .from('users')
        .update({
          memory_store_id: memoryStoreId,
          memory_store_created_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    // 3. Ensure conversation has a session_id
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, session_id, phase')
      .eq('id', body.conversationId)
      .eq('user_id', user.id)
      .single()

    if (!conv) return new Response('Conversation not found', { status: 404 })

    let sessionId = conv.session_id
    if (!sessionId) {
      const session = await createCoachSession({
        agentId: platform.agent_id,
        environmentId: platform.environment_id,
        memoryStoreId,
        title: `${body.skillName} · ${body.phase}`,
      })
      sessionId = session.id
      await supabase
        .from('conversations')
        .update({ session_id: sessionId, session_status: 'running' })
        .eq('id', body.conversationId)
    }

    // 4. Stream events back as JSON-Lines (one JSON object per line)
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let assistantText = ''
        const toolEvents: any[] = []

        const writeLine = (obj: NormalisedEvent) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

        try {
          for await (const ev of streamUserMessage({ sessionId: sessionId!, message: body.message })) {
            if (ev.kind === 'text') assistantText += ev.text
            if (ev.kind === 'tool_use' || ev.kind === 'tool_result') toolEvents.push(ev)
            writeLine(ev)
            if (ev.kind === 'idle' || ev.kind === 'error') break
          }
        } catch (err: any) {
          console.error('[/api/agents/chat] stream error:', err)
          writeLine({ kind: 'error', message: err?.message ?? 'Stream failed' })
        } finally {
          controller.close()
          // Persist messages (fire and forget)
          ;(async () => {
            try {
              await supabase.from('messages').insert([
                { conversation_id: body.conversationId, role: 'user', content: body.message },
                {
                  conversation_id: body.conversationId,
                  role: 'assistant',
                  content: assistantText,
                  tool_events: toolEvents.length ? toolEvents : null,
                },
              ])
              await supabase
                .from('conversations')
                .update({ session_status: 'idle', updated_at: new Date().toISOString() })
                .eq('id', body.conversationId)
            } catch (e) {
              console.error('[/api/agents/chat] persist failed:', e)
            }
          })()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('[/api/agents/chat]', err)
    return new Response(JSON.stringify({ error: err?.message ?? 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
