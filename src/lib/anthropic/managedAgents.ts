// src/lib/anthropic/managedAgents.ts
// Thin wrapper around the Anthropic Managed Agents beta SDK surface.
// We deliberately use `any` for SDK calls because the public TypeScript
// types may lag behind the beta endpoints. The SDK auto-attaches the
// `managed-agents-2026-04-01` beta header when given via defaultHeaders.

import Anthropic from '@anthropic-ai/sdk'

export const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01'

let _client: Anthropic | null = null
export function getAnthropic() {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')
  _client = new Anthropic({
    apiKey,
    defaultHeaders: { 'anthropic-beta': MANAGED_AGENTS_BETA },
  })
  return _client
}

/** Create a memory store for a single user. Returns memstore_... id. */
export async function createUserMemoryStore(params: {
  userName: string
  userEmail: string
}): Promise<string> {
  const client = getAnthropic() as any
  const store = await client.beta.memoryStores.create({
    name: `user:${params.userEmail}`,
    description:
      `Long-lived growth memory for ${params.userName}. ` +
      `Includes profile, per-skill notes, motivations, and recurring themes. ` +
      `Read /mnt/memory/user/profile.md at the start of every session.`,
  })
  return store.id as string
}

/** Create a Claude Session bound to (agent, environment, user memory store). */
export async function createCoachSession(params: {
  agentId: string
  environmentId: string
  memoryStoreId: string
  title: string
}): Promise<{ id: string }> {
  const client = getAnthropic() as any
  const session = await client.beta.sessions.create({
    agent: params.agentId,
    environment_id: params.environmentId,
    title: params.title,
    resources: [
      {
        type: 'memory_store',
        memory_store_id: params.memoryStoreId,
        access: 'read_write',
        instructions:
          'This is the participant\'s long-lived growth memory. ' +
          'Always check /mnt/memory/user/profile.md at the start of a session, ' +
          'and update files when the participant shares meaningful new context. ' +
          'Use small focused files; never invent memory.',
      },
    ],
  })
  return { id: session.id as string }
}

/**
 * Send a user message into an existing session and stream events back.
 * Returns an async generator of normalised events the route handler can
 * forward to the browser as JSON-lines / SSE.
 */
export async function* streamUserMessage(params: {
  sessionId: string
  message: string
}): AsyncGenerator<NormalisedEvent, void, unknown> {
  const client = getAnthropic() as any
  const stream = await client.beta.sessions.events.stream(params.sessionId)

  await client.beta.sessions.events.send(params.sessionId, {
    events: [
      {
        type: 'user.message',
        content: [{ type: 'text', text: params.message }],
      },
    ],
  })

  for await (const event of stream) {
    if (event.type === 'agent.message') {
      for (const block of event.content ?? []) {
        if (block?.type === 'text' && block.text) {
          yield { kind: 'text', text: block.text }
        }
      }
    } else if (event.type === 'agent.tool_use') {
      yield {
        kind: 'tool_use',
        id: event.id ?? `tu_${Date.now()}`,
        name: event.name,
        input: event.input,
      }
    } else if (event.type === 'agent.tool_result') {
      yield {
        kind: 'tool_result',
        id: event.tool_use_id ?? `tr_${Date.now()}`,
        output: typeof event.content === 'string' ? event.content : JSON.stringify(event.content),
      }
    } else if (event.type === 'session.status_idle') {
      yield { kind: 'idle' }
      break
    } else if (event.type?.startsWith('session.error')) {
      yield { kind: 'error', message: event.message ?? 'Session error' }
      break
    }
  }
}

export type NormalisedEvent =
  | { kind: 'text'; text: string }
  | { kind: 'tool_use'; id: string; name: string; input?: any }
  | { kind: 'tool_result'; id: string; output: string }
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
