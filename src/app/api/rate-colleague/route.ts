// src/app/api/rate-colleague/route.ts
//
// Voluntary colleague rating — separate from the Reality Check flow.
// A user can rate any colleague who has previously sent them a peer survey
// invite (the "connection" guard). Multiple submissions for the same
// (rater, ratee, skill) are allowed; the UI shows the latest as "current"
// and older ones as "superseded."

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const bodySchema = z.object({
  rateeId: z.string().uuid(),
  skillId: z.string().uuid(),
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  comments: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 },
      )
    }
    const { rateeId, skillId, ratings, comments } = parsed.data

    if (rateeId === user.id) {
      return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 })
    }
    if (Object.keys(ratings).length === 0) {
      return NextResponse.json({ error: 'Rate at least one dimension' }, { status: 400 })
    }

    const service = await createServiceClient()

    // Connection guard: ratee must have sent the current user a peer invite.
    const { data: me } = await service
      .from('users')
      .select('email, org_id')
      .eq('id', user.id)
      .single()

    if (!me?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { count: connectionCount } = await service
      .from('peer_invites')
      .select(
        '*, reality_check_rounds!inner(user_skills!inner(user_id))',
        { count: 'exact', head: true },
      )
      .eq('peer_email', me.email.toLowerCase())
      .eq('reality_check_rounds.user_skills.user_id', rateeId)

    if (!connectionCount || connectionCount === 0) {
      return NextResponse.json(
        { error: 'You can only rate colleagues who have connected with you.' },
        { status: 403 },
      )
    }

    // Insert voluntary rating (service client bypasses RLS for the insert
    // since colleague_ratings RLS uses auth.uid() which works with the
    // user-scoped client too — but service is cleaner here).
    const { data: inserted, error: insertErr } = await supabase
      .from('colleague_ratings')
      .insert({
        rater_id: user.id,
        ratee_id: rateeId,
        skill_id: skillId,
        ratings,
        comments: comments?.trim() || null,
      })
      .select('id, created_at')
      .single()

    if (insertErr) {
      console.error('[rate-colleague] insert failed:', insertErr)
      return NextResponse.json({ error: 'Could not save rating' }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id, createdAt: inserted.created_at })
  } catch (err) {
    console.error('[rate-colleague]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
