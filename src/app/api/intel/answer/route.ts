// src/app/api/intel/answer/route.ts
//
// Deterministic, single-slot writer for the structured Agent Intel profile.
//
// Replaces the old Haiku-driven extractor for ongoing chat: when a
// participant answers a slot question (or edits a card in the side panel),
// we just store their answer verbatim under the right key in
// agent_intel.profile (jsonb).
//
// Body: { userSkillId, slot, value }
//   - slot must be one of SLOT_KEYS
//   - value: string. Empty/whitespace clears the slot.
//
// Returns { profile } with the merged JSONB after the write.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SLOT_KEYS, type IntelProfile, type SlotKey } from '@/lib/agent/slots'

export const runtime = 'nodejs'

interface Body {
  userSkillId?: string
  slot?: string
  value?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as Body
    if (!body?.userSkillId) {
      return NextResponse.json({ error: 'userSkillId required' }, { status: 400 })
    }
    if (!body.slot || !SLOT_KEYS.includes(body.slot as SlotKey)) {
      return NextResponse.json({ error: 'invalid slot' }, { status: 400 })
    }
    const slot = body.slot as SlotKey
    const value = (body.value ?? '').trim()
    if (value.length > 500) {
      return NextResponse.json({ error: 'value too long' }, { status: 400 })
    }

    // Resolve skill + verify ownership.
    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, skill_id')
      .eq('id', body.userSkillId)
      .eq('user_id', user.id)
      .single()
    if (!userSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const { data: me } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // Read existing profile so we can merge the new slot in.
    const { data: existing } = await supabase
      .from('agent_intel')
      .select('profile')
      .eq('user_id', user.id)
      .eq('skill_id', userSkill.skill_id)
      .maybeSingle()

    const prevProfile = (existing?.profile ?? {}) as IntelProfile
    const nextProfile: IntelProfile = { ...prevProfile }
    if (value) nextProfile[slot] = value
    else delete nextProfile[slot]

    const { data: saved, error: upsertErr } = await supabase
      .from('agent_intel')
      .upsert(
        {
          user_id: user.id,
          skill_id: userSkill.skill_id,
          org_id: me?.org_id ?? null,
          profile: nextProfile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill_id' },
      )
      .select('profile, updated_at')
      .single()

    if (upsertErr) {
      console.error('[intel/answer] upsert failed:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      profile: (saved?.profile ?? nextProfile) as IntelProfile,
      updated_at: saved?.updated_at,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[intel/answer]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
