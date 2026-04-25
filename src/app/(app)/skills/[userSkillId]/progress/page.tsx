// src/app/(app)/skills/[userSkillId]/progress/page.tsx
// Progress/Growth comparison page - placeholder for Phase 10

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ userSkillId: string }>
}

export const metadata: Metadata = { title: 'Progress' }

export default async function ProgressPage({ params }: Props) {
  const { userSkillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('*, skill:skills(name, dimensions)')
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  if (userSkill.phase !== 'post') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">Progress Not Available Yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Complete at least one Reality Check round to see your progress and growth metrics.
        </p>
      </div>
    )
  }

  const { data: rounds } = await supabase
    .from('reality_check_rounds')
    .select('*')
    .eq('user_skill_id', userSkillId)
    .order('round_number', { ascending: true })

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Score summary */}
        <div className="nudge-card rounded-xl p-6 mb-6">
          <h2 className="font-bold text-brand-dark mb-4">Your Scores</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-brand-purple">
                {userSkill.current_peer?.toFixed(1) ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">
                Peer Score
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-brand-orange">
                {userSkill.self_avg?.toFixed(1) ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">
                Self Score
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-black ${(userSkill.peer_growth ?? 0) >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                {userSkill.peer_growth != null
                  ? `${userSkill.peer_growth >= 0 ? '+' : ''}${userSkill.peer_growth.toFixed(1)}`
                  : '—'
                }
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">
                Growth
              </div>
            </div>
          </div>
        </div>

        {/* Rounds history */}
        <div className="nudge-card rounded-xl p-6 mb-6">
          <h2 className="font-bold text-brand-dark mb-4">Reality Check History</h2>
          {rounds && rounds.length > 0 ? (
            <div className="space-y-3">
              {rounds.map(round => (
                <div key={round.id} className="flex items-center justify-between py-2 border-b border-card-border last:border-0">
                  <div>
                    <span className="font-semibold text-sm text-brand-dark">Round {round.round_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(round.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    round.closed_at
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'bg-brand-orange/10 text-brand-orange'
                  }`}>
                    {round.closed_at ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rounds recorded yet.</p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Detailed growth charts and Day 30/90 comparison coming in Phase 10
        </p>
      </div>
    </div>
  )
}
