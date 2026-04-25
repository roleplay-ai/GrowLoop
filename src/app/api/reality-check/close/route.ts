// src/app/api/reality-check/close/route.ts
//
// Closes the currently-open Reality Check round.
//   1. Pulls self_ratings + all submitted peer_ratings.
//   2. Verifies the round is closeable (self filled AND ≥3 peer responses,
//      OR 14 days have elapsed).
//   3. Computes per-dimension peer aggregate + overall peer mean.
//   4. Calls Haiku to cluster peer comments into 3-5 themes (best-effort
//      — falls back to an empty themes array on failure).
//   5. Updates user_skills with current_peer / self_avg / baseline_peer
//      (only on round 1) / rc_round + 1 / phase = 'post'.
//   6. Stamps reality_check_rounds.peer_aggregate, peer_themes, closed_at.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  aggregatePeerRatings,
  canCloseRound,
  selfAverage,
  type Ratings,
} from '@/lib/reality-check/helpers'
import type { SkillDimension } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z.object({
  userSkillId: z.string().uuid(),
  /** Set true to close even if peer count < 3 — used by Phase 10 re-survey
   *  flows that close the previous round before opening a new one. */
  force: z.boolean().optional(),
})

const COACH_MODEL = process.env.ANTHROPIC_COACH_MODEL ?? 'claude-haiku-4-5'

interface ThemeRow {
  name: string
  count: number
  sample?: string
}

async function clusterCommentsToThemes(
  comments: string[],
  skillName: string,
): Promise<ThemeRow[]> {
  if (!process.env.ANTHROPIC_API_KEY) return []
  const trimmed = comments.map((c) => c.trim()).filter(Boolean)
  if (trimmed.length === 0) return []

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: 700,
      system:
        "You cluster qualitative peer feedback into 3-5 short themes. " +
        "Return STRICT JSON only — an array of " +
        '{ "name": string, "count": number, "sample": string }. ' +
        "`name` is 2-4 words, `count` is how many comments roughly match the theme, " +
        "`sample` is one short verbatim phrase from the comments (no quotes). " +
        'Output ONLY the JSON array, no prose.',
      messages: [
        {
          role: 'user',
          content: `Skill being coached: ${skillName}\n\nPeer comments:\n${trimmed
            .map((c, i) => `${i + 1}. ${c}`)
            .join('\n')}`,
        },
      ],
    })

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    // Be defensive about ```json fences.
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (t: unknown): t is ThemeRow =>
          !!t &&
          typeof t === 'object' &&
          typeof (t as ThemeRow).name === 'string' &&
          typeof (t as ThemeRow).count === 'number',
      )
      .slice(0, 5)
      .map((t) => ({
        name: t.name.slice(0, 60),
        count: Math.max(1, Math.min(99, t.count)),
        sample: t.sample ? String(t.sample).slice(0, 200) : undefined,
      }))
  } catch (err) {
    console.warn('[rc/close] theme clustering failed:', err)
    return []
  }
}

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
    const { userSkillId, force } = parsed.data

    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, org_id, skill_id, rc_round, baseline_peer, surveys_filled')
      .eq('id', userSkillId)
      .eq('user_id', user.id)
      .single()
    if (!userSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // Skill dimensions (live source of truth).
    const { data: skill } = await supabase
      .from('skills')
      .select('id, name, dimensions')
      .eq('id', userSkill.skill_id!)
      .single()
    if (!skill) {
      return NextResponse.json({ error: 'Skill metadata missing' }, { status: 404 })
    }
    const dimensions = (skill.dimensions ?? []) as SkillDimension[]

    // Open round + invites + ratings.
    const { data: round } = await supabase
      .from('reality_check_rounds')
      .select('id, round_number, self_ratings, started_at')
      .eq('user_skill_id', userSkillId)
      .is('closed_at', null)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!round) {
      return NextResponse.json({ error: 'No open Reality Check round' }, { status: 400 })
    }

    const { data: invites } = await supabase
      .from('peer_invites')
      .select('id')
      .eq('reality_check_id', round.id)

    const inviteIds = (invites ?? []).map((i) => i.id)

    const { data: peerRatings } = inviteIds.length
      ? await supabase
          .from('peer_ratings')
          .select('ratings, comments')
          .in('peer_invite_id', inviteIds)
      : { data: [] as Array<{ ratings: Ratings; comments: string | null }> }

    const ratingsList = (peerRatings ?? []).map((r) => (r.ratings ?? {}) as Ratings)
    const comments = (peerRatings ?? [])
      .map((r) => r.comments?.trim())
      .filter((c): c is string => !!c)

    // Gate.
    if (!force) {
      const gate = canCloseRound({
        selfRatings: (round.self_ratings ?? null) as Ratings | null,
        peerResponseCount: ratingsList.length,
        startedAt: round.started_at,
      })
      if (!gate.ok) {
        return NextResponse.json({ error: gate.reason }, { status: 400 })
      }
    }

    // Compute aggregates.
    const peerAgg = aggregatePeerRatings(dimensions, ratingsList)
    const selfAvg = selfAverage(dimensions, (round.self_ratings ?? null) as Ratings | null)
    const themes = await clusterCommentsToThemes(comments, skill.name)

    // Persist round.
    const { error: roundErr } = await supabase
      .from('reality_check_rounds')
      .update({
        peer_aggregate: peerAgg,
        peer_themes: themes,
        closed_at: new Date().toISOString(),
      })
      .eq('id', round.id)
    if (roundErr) {
      console.error('[rc/close] round update failed:', roundErr)
      return NextResponse.json({ error: roundErr.message }, { status: 500 })
    }

    // Persist user_skill summary. surveys_filled mirrors the latest round's
    // submitted count (HR dashboard shows the freshest signal). Round number
    // bumps to match what we just closed; phase moves to 'post'.
    const isFirstRound = (userSkill.rc_round ?? 0) === 0
    const updates: Record<string, unknown> = {
      current_peer: peerAgg.overall,
      self_avg: selfAvg,
      surveys_filled: ratingsList.length,
      rc_round: round.round_number,
      phase: 'post',
    }
    if (isFirstRound && userSkill.baseline_peer == null) {
      updates.baseline_peer = peerAgg.overall
    }

    const { error: usErr } = await supabase
      .from('user_skills')
      .update(updates)
      .eq('id', userSkillId)
    if (usErr) {
      console.error('[rc/close] user_skill update failed:', usErr)
      return NextResponse.json({ error: usErr.message }, { status: 500 })
    }

    // Audit (best-effort).
    try {
      const service = await createServiceClient()
      await service.from('audit_log').insert({
        org_id: userSkill.org_id,
        actor_id: user.id,
        actor_role: 'participant',
        action: 'reality_check_close',
        target_type: 'reality_check_rounds',
        target_id: round.id,
        metadata: {
          round_number: round.round_number,
          peer_count: ratingsList.length,
          self_avg: selfAvg,
          peer_avg: peerAgg.overall,
          forced: !!force,
        },
      })
    } catch (e) {
      console.warn('[rc/close] audit log failed:', e)
    }

    // NOTE: Phase 9 will hook /api/action-plan/generate here. For now the
    // results page just shows a "Coming soon" CTA so the round can close
    // safely without that endpoint existing yet.

    return NextResponse.json({
      rcRoundId: round.id,
      roundNumber: round.round_number,
      peerCount: ratingsList.length,
      peerAvg: peerAgg.overall,
      selfAvg,
      themes,
      isFirstRound,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[rc/close]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
