// src/lib/agent/extractIntel.ts
//
// Extracts structured "Agent Intel" from a coaching conversation.
//
// Runs after each assistant turn so the participant can SEE what the
// coach has learned about them in the right-hand panel — same UX as the
// reference HTML prototype where slots fill up live as you chat.
//
// Uses Claude Haiku (fast + cheap) and asks for strict JSON only. We
// merge the extraction with whatever's already in `agent_intel` so we
// never lose context across turns.

import Anthropic from '@anthropic-ai/sdk'

const EXTRACT_MODEL =
  process.env.ANTHROPIC_INTEL_MODEL ?? 'claude-haiku-4-5'

let _client: Anthropic | null = null
function getClient() {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')
  _client = new Anthropic({ apiKey })
  return _client
}

export interface AgentIntel {
  current_level: string | null
  context: string | null
  motivations: string[]
  blockers: string[]
  raw_summary: string | null
}

export interface ChatTurnLite {
  role: 'user' | 'assistant'
  content: string
}

const EMPTY: AgentIntel = {
  current_level: null,
  context: null,
  motivations: [],
  blockers: [],
  raw_summary: null,
}

const SYSTEM = `You are an "intel extractor" running silently behind a coaching chat.

Your job: read the conversation between a learner and their AI coach (Nudge), and produce a STRUCTURED PROFILE of what the coach has learned about the learner so far. This profile is shown to the LEARNER in a sidebar so they can see what the agent has captured. It must be accurate, concise, and never invent facts.

OUTPUT — return ONLY valid JSON in this exact shape (no prose, no markdown, no code fences):

{
  "current_level": string | null,         // 1 short phrase, e.g. "Beginner — first manager role"
  "context": string | null,               // 1-2 sentences about role, team, situation
  "motivations": string[],                // up to 4 short bullets, what they want from this skill
  "blockers": string[],                   // up to 4 short bullets, what's getting in the way
  "raw_summary": string | null            // 1-3 sentence plain-English summary of who this person is
}

RULES
- Only include fields the conversation actually supports. If a slot is unclear, leave it null / empty array.
- Merge with EXISTING_INTEL: keep prior facts unless the new conversation contradicts or refines them.
- Strings should be short, specific, written ABOUT the learner ("Senior PM, 4 direct reports") not generic.
- NEVER include the coach's questions, only the LEARNER's facts.
- NEVER invent details. Better empty than wrong.
- Output JSON. Nothing else. No \`\`\`json fences.`

function safeParseJson<T>(raw: string): T | null {
  // Models sometimes wrap JSON in code fences despite instructions.
  const trimmed = raw.trim()
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(stripped) as T
  } catch {
    // Try to find the first {...} block
    const m = stripped.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0]) as T
    } catch {
      return null
    }
  }
}

function clampList(arr: unknown, max = 4): string[] {
  if (!Array.isArray(arr)) return []
  return arr
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, max)
}

function clampText(v: unknown, maxLen = 240): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.length > maxLen ? t.slice(0, maxLen - 1).trimEnd() + '…' : t
}

/**
 * Pull a fresh structured profile out of the conversation.
 * Returns the EMPTY intel on any failure (we never want extraction to
 * break the chat flow).
 */
export async function extractIntelFromConversation(params: {
  skillName: string
  existing: Partial<AgentIntel> | null
  history: ChatTurnLite[]
}): Promise<AgentIntel> {
  const { skillName, existing, history } = params

  // Cap history at last 30 turns to keep cost predictable.
  const recent = history.slice(-30)
  if (recent.length === 0) {
    return {
      current_level: existing?.current_level ?? null,
      context: existing?.context ?? null,
      motivations: existing?.motivations ?? [],
      blockers: existing?.blockers ?? [],
      raw_summary: existing?.raw_summary ?? null,
    }
  }

  const transcript = recent
    .map((t) => `${t.role === 'user' ? 'LEARNER' : 'COACH'}: ${t.content}`)
    .join('\n\n')

  const existingBlock = JSON.stringify(
    {
      current_level: existing?.current_level ?? null,
      context: existing?.context ?? null,
      motivations: existing?.motivations ?? [],
      blockers: existing?.blockers ?? [],
      raw_summary: existing?.raw_summary ?? null,
    },
    null,
    2,
  )

  const userMsg = `SKILL: ${skillName}

EXISTING_INTEL (from prior turns — preserve unless contradicted):
${existingBlock}

CONVERSATION (most recent ${recent.length} turns):
${transcript}

Return the merged JSON profile now.`

  try {
    const res = await getClient().messages.create({
      model: EXTRACT_MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = safeParseJson<Partial<AgentIntel>>(text) ?? {}

    return {
      current_level: clampText(parsed.current_level, 120) ?? existing?.current_level ?? null,
      context: clampText(parsed.context, 320) ?? existing?.context ?? null,
      motivations: clampList(parsed.motivations, 4),
      blockers: clampList(parsed.blockers, 4),
      raw_summary: clampText(parsed.raw_summary, 400) ?? existing?.raw_summary ?? null,
    }
  } catch (err) {
    console.error('[extractIntel] failed:', err)
    return {
      current_level: existing?.current_level ?? null,
      context: existing?.context ?? null,
      motivations: existing?.motivations ?? [],
      blockers: existing?.blockers ?? [],
      raw_summary: existing?.raw_summary ?? null,
    }
  }
}

export const EMPTY_INTEL = EMPTY
