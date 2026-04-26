// src/app/(app)/skills/[userSkillId]/reality-check/page.tsx
//
// Dedicated Reality Check tab. Server-fetches the open round + invites and
// passes everything to the client orchestrator. If the round is already closed
// (phase = 'post') it redirects to the results view.

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { SkillDimension } from '@/lib/types'
import RealityCheckOrchestrator, {
  type RCOrchestratorInvite,
} from '@/components/skills/RealityCheckOrchestrator'

interface Props {
  params: Promise<{ userSkillId: string }>
}

export const metadata: Metadata = { title: 'Reality Check' }

function buildSurveyUrl(token: string): string {
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? ''
  return `${base}/peer-survey/${token}`
}

export default async function RealityCheckPage({ params }: Props) {
  const { userSkillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('id, phase, rc_round, skill:skills(id, name, dimensions)')
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  // If the round was already closed, send them to the results page —
  // they shouldn't be able to "re-do" the same round here.
  // (Phase 10 will add an explicit "Start new round" affordance.)
  if (userSkill.phase === 'post') {
    redirect(`/skills/${userSkillId}/results`)
  }

  // Phase = 'pre' or 'training' both reach the orchestrator.
  // The self-rate API transitions pre → training automatically.
  // Supabase returns joined relationships
  // as a singleton or array depending on cardinality inference; cast through
  // any to match the codebase pattern (see chat/page.tsx).
  const skill = userSkill.skill as unknown as
    | { id: string; name: string; dimensions: SkillDimension[] | null }
    | null
  const dimensions = (skill?.dimensions ?? []) as SkillDimension[]

  const { data: round } = await supabase
    .from('reality_check_rounds')
    .select('id, round_number, self_ratings, self_comments, started_at, closed_at')
    .eq('user_skill_id', userSkillId)
    .is('closed_at', null)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let invites: RCOrchestratorInvite[] = []
  if (round) {
    const { data: rows } = await supabase
      .from('peer_invites')
      .select('id, peer_email, peer_name, peer_relation, token, status, submitted_at')
      .eq('reality_check_id', round.id)
      .order('sent_at', { ascending: true })
    invites = (rows ?? []).map((r) => ({
      id: r.id,
      peer_email: r.peer_email,
      peer_name: r.peer_name,
      peer_relation: r.peer_relation,
      token: r.token,
      status: r.status,
      submitted_at: r.submitted_at,
      surveyUrl: buildSurveyUrl(r.token),
    }))
  }

  return (
    <div className="h-full overflow-y-auto">
      <RealityCheckOrchestrator
        userSkillId={userSkillId}
        skillName={skill?.name ?? 'this skill'}
        dimensions={dimensions}
        selfRatings={(round?.self_ratings ?? null) as Record<string, number> | null}
        selfComments={round?.self_comments ?? null}
        invites={invites}
        roundNumber={round?.round_number ?? (userSkill.rc_round ?? 0) + 1}
        startedAt={round?.started_at ?? null}
        roundActive={!!round}
      />
    </div>
  )
}
