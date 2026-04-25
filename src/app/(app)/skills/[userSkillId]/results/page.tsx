// src/app/(app)/skills/[userSkillId]/results/page.tsx
//
// Reality Check results — visible once a round has been closed (phase='post').
// Reads the latest closed round, builds dimension rows from peer_aggregate +
// self_ratings, then hands everything to <ResultsView/>.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SkillDimension } from '@/lib/types'
import {
  buildDimensionRows,
  selfAverage,
  type PeerAggregate,
  type Ratings,
} from '@/lib/reality-check/helpers'
import ResultsView, { type ThemeRow, type RoundHistoryRow } from '@/components/skills/ResultsView'

interface Props {
  params: Promise<{ userSkillId: string }>
}

export const metadata: Metadata = { title: 'Reality Check Results' }

export default async function ResultsPage({ params }: Props) {
  const { userSkillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select(
      'id, phase, baseline_peer, current_peer, peer_growth, self_avg, rc_round, skill:skills(id, name, icon, dimensions)',
    )
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  if (userSkill.phase !== 'post') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">No results yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
          Close a Reality Check round to unlock your self-vs-peer report.
        </p>
        <Link
          href={`/skills/${userSkillId}/reality-check`}
          className="px-5 py-3 rounded-xl bg-brand-purple text-white text-sm font-black
                     hover:bg-brand-purple/90 transition-all"
        >
          📈 Open Reality Check
        </Link>
      </div>
    )
  }

  const skill = userSkill.skill as unknown as
    | { id: string; name: string; icon: string | null; dimensions: SkillDimension[] | null }
    | null
  const dimensions = (skill?.dimensions ?? []) as SkillDimension[]

  // Latest closed round.
  const { data: round } = await supabase
    .from('reality_check_rounds')
    .select(
      'id, round_number, self_ratings, self_comments, peer_aggregate, peer_themes, closed_at, started_at',
    )
    .eq('user_skill_id', userSkillId)
    .not('closed_at', 'is', null)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">
          We couldn&apos;t find a closed round
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Your skill is marked as post-training, but no closed Reality Check round exists.
          Try opening a new round.
        </p>
      </div>
    )
  }

  const peerAgg = (round.peer_aggregate ?? null) as PeerAggregate | null
  const selfRatings = (round.self_ratings ?? null) as Ratings | null
  const themes = ((round.peer_themes ?? []) as ThemeRow[]) ?? []

  const rows = buildDimensionRows(dimensions, selfRatings, peerAgg)
  const peerAvg = peerAgg?.overall ?? userSkill.current_peer ?? 0
  const selfAvg =
    userSkill.self_avg ?? selfAverage(dimensions, selfRatings)

  // Peer-response count for this round
  const { data: invites } = await supabase
    .from('peer_invites')
    .select('id, status, peer_relation')
    .eq('reality_check_id', round.id)

  const submittedCount = (invites ?? []).filter((i) => i.status === 'submitted').length

  // Round history (closed rounds only).
  const { data: closedRounds } = await supabase
    .from('reality_check_rounds')
    .select('round_number, closed_at, self_ratings, peer_aggregate')
    .eq('user_skill_id', userSkillId)
    .not('closed_at', 'is', null)
    .order('round_number', { ascending: true })

  const history: RoundHistoryRow[] = (closedRounds ?? []).map((r) => {
    const sr = (r.self_ratings ?? null) as Ratings | null
    const pa = (r.peer_aggregate ?? null) as PeerAggregate | null
    return {
      round_number: r.round_number,
      closed_at: r.closed_at,
      self_avg: selfAverage(dimensions, sr),
      peer_avg: pa?.overall ?? 0,
    }
  })

  return (
    <div className="h-full overflow-y-auto">
      <ResultsView
        skillName={skill?.name ?? 'this skill'}
        skillIcon={skill?.icon ?? null}
        dimensions={dimensions}
        rows={rows}
        selfAvg={selfAvg}
        peerAvg={peerAvg}
        baselinePeer={userSkill.baseline_peer ?? null}
        peerGrowth={userSkill.peer_growth ?? null}
        rcRound={round.round_number}
        closedAt={round.closed_at}
        peerCount={submittedCount}
        themes={themes}
        selfComments={round.self_comments}
        history={history}
        invites={(invites ?? []).map((i) => ({
          peer_relation: i.peer_relation,
          status: i.status,
        }))}
        userSkillId={userSkillId}
      />
    </div>
  )
}
