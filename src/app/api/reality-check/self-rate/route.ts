// src/app/api/reality-check/self-rate/route.ts
//
// Saves the participant's self-rating for the currently-open Reality Check
// round. Lazily creates a round if none exists yet (handles the case where
// the participant self-rates before sending peer invites).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const bodySchema = z.object({
  userSkillId: z.string().uuid(),
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  comments: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 },
      )
    }
    const { userSkillId, ratings, comments } = parsed.data

    if (Object.keys(ratings).length === 0) {
      return NextResponse.json({ error: 'Provide at least one rating' }, { status: 400 })
    }

    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, rc_round, phase')
      .eq('id', userSkillId)
      .eq('user_id', user.id)
      .single()
    if (!userSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // Find or create the open round.
    let { data: openRound } = await supabase
      .from('reality_check_rounds')
      .select('id, round_number')
      .eq('user_skill_id', userSkillId)
      .is('closed_at', null)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!openRound) {
      const { data: created, error: roundErr } = await supabase
        .from('reality_check_rounds')
        .insert({
          user_skill_id: userSkillId,
          round_number: (userSkill.rc_round ?? 0) + 1,
        })
        .select('id, round_number')
        .single()
      if (roundErr || !created) {
        console.error('[rc/self-rate] round insert failed:', roundErr)
        return NextResponse.json({ error: 'Could not start round' }, { status: 500 })
      }
      openRound = created
    }

    const { error: updErr } = await supabase
      .from('reality_check_rounds')
      .update({
        self_ratings: ratings,
        self_comments: comments ?? null,
      })
      .eq('id', openRound.id)

    if (updErr) {
      console.error('[rc/self-rate] update failed:', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Move phase to 'training' on first self-rate (so the SkillTabs unlocks
    // the Plan tab and the chat sees the new phase).
    if (userSkill.phase === 'pre') {
      await supabase
        .from('user_skills')
        .update({ phase: 'training' })
        .eq('id', userSkillId)
    }

    return NextResponse.json({
      rcRoundId: openRound.id,
      roundNumber: openRound.round_number,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[rc/self-rate]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
