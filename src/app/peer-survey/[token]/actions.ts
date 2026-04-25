'use server'
// src/app/peer-survey/[token]/actions.ts
//
// Anonymous peer-survey submission. The token is the only auth — we hit
// peer_invites with a service-role client so RLS doesn't block us.
//
// One submission per token (peer_ratings.peer_invite_id is unique). We
// also flip peer_invites.status='submitted' and bump
// user_skills.surveys_filled so the participant's status panel updates.

import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

const ratingSchema = z.object({
  token: z.string().min(8),
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  comments: z.string().max(2000).optional(),
})

export interface SubmitResult {
  success: boolean
  error?: string
}

export async function submitPeerRating(input: unknown): Promise<SubmitResult> {
  const parsed = ratingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { token, ratings, comments } = parsed.data

  if (Object.keys(ratings).length === 0) {
    return { success: false, error: 'Rate at least one dimension' }
  }

  const supabase = await createServiceClient()

  const { data: invite } = await supabase
    .from('peer_invites')
    .select('id, status, reality_check_id')
    .eq('token', token)
    .single()

  if (!invite) {
    return { success: false, error: 'Invalid or expired survey link' }
  }
  if (invite.status === 'submitted') {
    return { success: false, error: 'This survey has already been submitted' }
  }
  if (invite.status === 'expired') {
    return { success: false, error: 'This survey link has expired' }
  }

  const { error: rateErr } = await supabase
    .from('peer_ratings')
    .insert({
      peer_invite_id: invite.id,
      ratings,
      comments: comments?.trim() || null,
    })

  if (rateErr) {
    if (rateErr.code === '23505') {
      // Race: someone already submitted with this invite_id.
      return { success: false, error: 'This survey has already been submitted' }
    }
    console.error('[peer-survey/submit] rating insert failed:', rateErr)
    return { success: false, error: 'Could not save your response' }
  }

  await supabase
    .from('peer_invites')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  // Bump surveys_filled on the user_skill so the participant's chat banner
  // can reflect "X / Y peers responded" without polling all invites.
  if (invite.reality_check_id) {
    const { data: round } = await supabase
      .from('reality_check_rounds')
      .select('user_skill_id')
      .eq('id', invite.reality_check_id)
      .single()

    if (round?.user_skill_id) {
      const { count } = await supabase
        .from('peer_ratings')
        .select('*, peer_invites!inner(reality_check_id)', { count: 'exact', head: true })
        .eq('peer_invites.reality_check_id', invite.reality_check_id)

      await supabase
        .from('user_skills')
        .update({ surveys_filled: count ?? 0 })
        .eq('id', round.user_skill_id)
    }
  }

  return { success: true }
}
