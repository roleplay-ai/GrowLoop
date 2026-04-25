// src/app/api/intel/extract/route.ts
//
// Called by the ChatWindow after each completed assistant turn.
// Pulls structured intel out of the conversation, upserts into
// `agent_intel`, and returns the merged record so the participant's
// Coach Memory panel can update live.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractIntelFromConversation, type ChatTurnLite } from '@/lib/agent/extractIntel'

export const runtime = 'nodejs'
export const maxDuration = 30

interface Body {
  userSkillId: string
  conversationId?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY missing — intel extraction disabled.' },
        { status: 503 },
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as Body
    if (!body?.userSkillId) {
      return NextResponse.json({ error: 'userSkillId required' }, { status: 400 })
    }

    // 1. Resolve the skill + verify ownership
    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, skill:skills(id, name)')
      .eq('id', body.userSkillId)
      .eq('user_id', user.id)
      .single()

    if (!userSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    const skill = userSkill.skill as unknown as { id: string; name: string } | null
    if (!skill?.id) {
      return NextResponse.json({ error: 'Skill record invalid' }, { status: 500 })
    }

    // 2. Pull the user's org_id (needed for RLS-friendly insert)
    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // 3. Pull the existing intel row (if any)
    const { data: existing } = await supabase
      .from('agent_intel')
      .select('current_level, context, motivations, blockers, raw_summary')
      .eq('user_id', user.id)
      .eq('skill_id', skill.id)
      .maybeSingle()

    // 4. Build conversation history. If a specific conversationId was
    //    given we use that one; otherwise we aggregate ALL messages for
    //    this user_skill so context survives across sessions.
    let history: ChatTurnLite[] = []
    if (body.conversationId) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', body.conversationId)
        .order('created_at', { ascending: true })
      history = (msgs ?? []).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })) as ChatTurnLite[]
    } else {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('user_skill_id', body.userSkillId)
        .order('created_at', { ascending: false })
        .limit(3)
      const ids = (convs ?? []).map((c) => c.id)
      if (ids.length) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('role, content, created_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: true })
        history = (msgs ?? []).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })) as ChatTurnLite[]
      }
    }

    // 5. Run extraction
    const intel = await extractIntelFromConversation({
      skillName: skill.name,
      existing: existing ?? null,
      history,
    })

    // 6. Upsert
    const { data: saved, error: upsertErr } = await supabase
      .from('agent_intel')
      .upsert(
        {
          user_id: user.id,
          skill_id: skill.id,
          org_id: profile?.org_id ?? null,
          current_level: intel.current_level,
          context: intel.context,
          motivations: intel.motivations,
          blockers: intel.blockers,
          raw_summary: intel.raw_summary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill_id' },
      )
      .select('current_level, context, motivations, blockers, raw_summary, updated_at')
      .single()

    if (upsertErr) {
      console.error('[intel/extract] upsert failed:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ intel: saved })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[intel/extract]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
