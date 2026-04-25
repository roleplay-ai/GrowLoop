// src/app/api/reality-check/start/route.ts
//
// Kicks off a Reality Check round.
//   * Validates 3–8 peers with email + relation
//   * Reuses the latest open round for this user_skill if one exists
//     (so re-submitting the form just appends invites)
//   * Otherwise creates a new round with round_number = user_skill.rc_round
//   * Sets user_skills.phase = 'training' (Phase 7.2 transition)
//   * Returns survey URLs the participant can share manually until
//     SendGrid is wired up in Phase 11

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// A peer can be specified two ways:
//   1. By userId — picked from the same-org directory; we hydrate name+email
//      from the users table server-side (preferred path)
//   2. By raw name + email — for the rare case where the rater is outside
//      the org. Disabled unless ALLOW_EXTERNAL_PEERS is set, since the spec
//      now says peers must be org members.
const orgPeerSchema = z.object({
  userId: z.string().uuid(),
  relation: z.enum(['manager', 'peer', 'report', 'cross_fn']),
})

const externalPeerSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(80),
  email: z.string().trim().email('Invalid email').max(160),
  relation: z.enum(['manager', 'peer', 'report', 'cross_fn']),
})

const peerSchema = z.union([orgPeerSchema, externalPeerSchema])

const bodySchema = z.object({
  userSkillId: z.string().uuid(),
  peers: z.array(peerSchema).min(3, 'At least 3 peers').max(8, 'Max 8 peers'),
})

type ResolvedPeer = {
  name: string
  email: string
  relation: 'manager' | 'peer' | 'report' | 'cross_fn'
}

function buildSurveyUrl(req: NextRequest, token: string): string {
  const base =
    process.env.APP_URL?.replace(/\/$/, '') ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  return `${base}/peer-survey/${token}`
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
    const { userSkillId, peers } = parsed.data

    const { data: userSkill } = await supabase
      .from('user_skills')
      .select('id, user_id, org_id, rc_round, phase')
      .eq('id', userSkillId)
      .eq('user_id', user.id)
      .single()
    if (!userSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // ── Resolve peers: org-userId → users table; external → as-is ──────────
    const orgUserIds = peers
      .filter((p): p is z.infer<typeof orgPeerSchema> => 'userId' in p)
      .map((p) => p.userId)

    const directory: Record<string, { name: string; email: string; org_id: string | null }> = {}
    if (orgUserIds.length > 0) {
      const { data: orgUsers, error: dirErr } = await supabase
        .from('users')
        .select('id, name, email, org_id, status')
        .in('id', orgUserIds)

      if (dirErr) {
        console.error('[rc/start] directory lookup failed:', dirErr)
        return NextResponse.json(
          { error: 'Could not resolve selected peers' },
          { status: 500 },
        )
      }

      for (const u of orgUsers ?? []) {
        // Same-org guard so a participant can't pass a userId from another
        // org by tampering with the request body.
        if (u.org_id !== userSkill.org_id) continue
        if (u.status === 'inactive') continue
        directory[u.id] = { name: u.name, email: u.email, org_id: u.org_id }
      }
    }

    const resolvedPeers: ResolvedPeer[] = []
    for (const p of peers) {
      if ('userId' in p) {
        const hit = directory[p.userId]
        if (!hit) {
          return NextResponse.json(
            { error: 'One of the selected peers is no longer available in your org.' },
            { status: 400 },
          )
        }
        resolvedPeers.push({ name: hit.name, email: hit.email, relation: p.relation })
      } else {
        if (!process.env.ALLOW_EXTERNAL_PEERS) {
          return NextResponse.json(
            { error: 'Peers must be selected from your organization directory.' },
            { status: 400 },
          )
        }
        resolvedPeers.push({ name: p.name.trim(), email: p.email.trim(), relation: p.relation })
      }
    }

    // 1. Reuse the latest open round if any, else create a new one.
    let { data: openRound } = await supabase
      .from('reality_check_rounds')
      .select('id, round_number, started_at')
      .eq('user_skill_id', userSkillId)
      .is('closed_at', null)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!openRound) {
      const newRoundNumber = (userSkill.rc_round ?? 0) + 1
      const { data: created, error: roundErr } = await supabase
        .from('reality_check_rounds')
        .insert({
          user_skill_id: userSkillId,
          round_number: newRoundNumber,
        })
        .select('id, round_number, started_at')
        .single()
      if (roundErr || !created) {
        console.error('[rc/start] round insert failed:', roundErr)
        return NextResponse.json(
          { error: 'Could not start round. Try again.' },
          { status: 500 },
        )
      }
      openRound = created
    }

    // 2. De-dup peer emails against ones already invited for this round.
    const { data: existingInvites } = await supabase
      .from('peer_invites')
      .select('peer_email')
      .eq('reality_check_id', openRound.id)
    const existingEmails = new Set(
      (existingInvites ?? []).map((r) => r.peer_email.toLowerCase()),
    )

    const fresh = resolvedPeers.filter(
      (p) => !existingEmails.has(p.email.toLowerCase()),
    )

    // 3. Insert peer_invites in one shot.
    let invites: Array<{
      id: string
      peer_email: string
      peer_name: string | null
      peer_relation: string | null
      token: string
      surveyUrl: string
    }> = []

    if (fresh.length > 0) {
      const { data: inserted, error: invErr } = await supabase
        .from('peer_invites')
        .insert(
          fresh.map((p) => ({
            reality_check_id: openRound!.id,
            peer_email: p.email.toLowerCase(),
            peer_name: p.name,
            peer_relation: p.relation,
          })),
        )
        .select('id, peer_email, peer_name, peer_relation, token')

      if (invErr || !inserted) {
        console.error('[rc/start] invites insert failed:', invErr)
        return NextResponse.json(
          { error: 'Could not save peer invites. Try again.' },
          { status: 500 },
        )
      }

      invites = inserted.map((i) => ({
        ...i,
        surveyUrl: buildSurveyUrl(req, i.token),
      }))
    }

    // Always re-fetch the full invite list for this round so the UI has
    // a consistent view (newly added + previously added).
    const { data: allInvites } = await supabase
      .from('peer_invites')
      .select('id, peer_email, peer_name, peer_relation, token, status, submitted_at')
      .eq('reality_check_id', openRound.id)
      .order('sent_at', { ascending: true })

    // 4. Bump user_skills.phase → 'training' + surveys_sent counter.
    if (userSkill.phase === 'pre' || fresh.length > 0) {
      await supabase
        .from('user_skills')
        .update({
          phase: 'training',
          surveys_sent: (allInvites ?? []).length,
        })
        .eq('id', userSkillId)
    }

    // 5. Audit log (service role bypasses RLS).
    try {
      const service = await createServiceClient()
      await service.from('audit_log').insert({
        org_id: userSkill.org_id,
        actor_id: user.id,
        actor_role: 'participant',
        action: 'reality_check_start',
        target_type: 'reality_check_rounds',
        target_id: openRound.id,
        metadata: {
          round_number: openRound.round_number,
          peers_added: fresh.length,
          peers_total: (allInvites ?? []).length,
        },
      })
    } catch (e) {
      console.warn('[rc/start] audit log failed:', e)
    }

    return NextResponse.json({
      rcRoundId: openRound.id,
      roundNumber: openRound.round_number,
      addedCount: fresh.length,
      totalInvites: (allInvites ?? []).length,
      invites: (allInvites ?? []).map((i) => ({
        id: i.id,
        peer_email: i.peer_email,
        peer_name: i.peer_name,
        peer_relation: i.peer_relation,
        token: i.token,
        status: i.status,
        submitted_at: i.submitted_at,
        surveyUrl: buildSurveyUrl(req, i.token),
      })),
      newInvites: invites,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[rc/start]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
