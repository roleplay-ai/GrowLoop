// src/app/api/intel/profile/route.ts
//
// Read-only "what slots are currently filled" endpoint.
// Called by the chat after each Haiku turn so the side-panel can
// instantly reflect any record_intel_slot tool calls the model just made.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { IntelProfile } from '@/lib/agent/slots'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userSkillId = req.nextUrl.searchParams.get('userSkillId')
    if (!userSkillId) {
      return NextResponse.json({ error: 'userSkillId required' }, { status: 400 })
    }

    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, skill_id')
      .eq('id', userSkillId)
      .eq('user_id', user.id)
      .single()
    if (!userSkill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    const { data: intel } = await supabase
      .from('agent_intel')
      .select('profile, updated_at')
      .eq('user_id', user.id)
      .eq('skill_id', userSkill.skill_id)
      .maybeSingle()

    return NextResponse.json({
      profile: (intel?.profile ?? {}) as IntelProfile,
      updated_at: intel?.updated_at ?? null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
