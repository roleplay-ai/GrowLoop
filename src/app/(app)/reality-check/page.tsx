// src/app/(app)/reality-check/page.tsx
//
// Top-level Reality Check hub. Aggregates RC rounds across every skill the
// participant is enrolled in. Three lanes:
//   • Active   – phase='training' with an open round
//   • Past     – phase='post' (latest round closed)
//   • Not yet  – phase='pre'   (chat hasn't transitioned them yet)
//
// Each card links into the dedicated /skills/[id]/reality-check or
// /skills/[id]/results page; "Not yet" cards link to chat to nudge the user
// to start a conversation that triggers the transition.

import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reality Check' }

interface SkillJoin {
  id: string
  name: string
  icon: string | null
}

interface UserSkillRow {
  id: string
  user_id: string
  skill_id: string
  phase: 'pre' | 'training' | 'post'
  rc_round: number
  current_self_avg: number | null
  current_peer_avg: number | null
  surveys_sent: number
  surveys_filled: number
  skill: SkillJoin
}

interface RoundRow {
  id: string
  user_skill_id: string
  round_number: number
  started_at: string
  closed_at: string | null
  peer_avg_score: number | null
  self_avg_score: number | null
}

const SOFT_DEADLINE_DAYS = 14

function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function PhasePill({ phase }: { phase: 'pre' | 'training' | 'post' }) {
  const map = {
    pre: { label: 'Not started', cls: 'bg-muted text-muted-foreground' },
    training: { label: 'In progress', cls: 'bg-brand-purple/15 text-brand-purple' },
    post: { label: 'Complete', cls: 'bg-brand-green/15 text-brand-green' },
  } as const
  const { label, cls } = map[phase]
  return (
    <span className={`text-[10px] font-extrabold tracking-[0.15em] uppercase rounded-full px-2.5 py-0.5 ${cls}`}>
      {label}
    </span>
  )
}

export default async function RealityCheckHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Pull all enrolled active skills for this user.
  const { data: userSkillsRaw } = await supabase
    .from('user_skills')
    .select(`
      id, user_id, skill_id, phase, rc_round, current_self_avg, current_peer_avg,
      surveys_sent, surveys_filled,
      skill:skills(id, name, icon)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })

  // Supabase types treat foreign joins as arrays; we know it's a single object.
  const userSkills = ((userSkillsRaw ?? []) as unknown as UserSkillRow[]).filter(
    (us) => us.skill,
  )

  let rounds: RoundRow[] = []
  if (userSkills.length > 0) {
    const ids = userSkills.map((us) => us.id)
    const { data: roundsRaw } = await supabase
      .from('reality_check_rounds')
      .select('id, user_skill_id, round_number, started_at, closed_at, peer_avg_score, self_avg_score')
      .in('user_skill_id', ids)
      .order('round_number', { ascending: false })
    rounds = (roundsRaw ?? []) as RoundRow[]
  }

  // For each skill, pluck the latest round (closed or open) and the open one
  // if it exists.
  const byUserSkill: Record<
    string,
    { latest: RoundRow | null; open: RoundRow | null }
  > = {}
  for (const r of rounds) {
    const slot = byUserSkill[r.user_skill_id] ??= { latest: null, open: null }
    if (!slot.latest) slot.latest = r
    if (!r.closed_at && !slot.open) slot.open = r
  }

  // Pull invite counts in one round-trip for the open rounds.
  const openRoundIds = Object.values(byUserSkill)
    .map((s) => s.open?.id)
    .filter(Boolean) as string[]

  const inviteCounts: Record<string, { total: number; submitted: number }> = {}
  if (openRoundIds.length > 0) {
    const { data: invs } = await supabase
      .from('peer_invites')
      .select('reality_check_id, status')
      .in('reality_check_id', openRoundIds)
    for (const i of invs ?? []) {
      const slot = inviteCounts[i.reality_check_id] ??= { total: 0, submitted: 0 }
      slot.total += 1
      if (i.status === 'submitted') slot.submitted += 1
    }
  }

  const active: UserSkillRow[] = []
  const past: UserSkillRow[] = []
  const notYet: UserSkillRow[] = []
  for (const us of userSkills) {
    if (us.phase === 'training') active.push(us)
    else if (us.phase === 'post') past.push(us)
    else notYet.push(us)
  }

  const totalSurveysOut = active.reduce((sum, us) => sum + (us.surveys_sent ?? 0), 0)
  const totalSurveysIn = active.reduce((sum, us) => sum + (us.surveys_filled ?? 0), 0)

  const now = new Date()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Reality Check"
        rightSlot={
          <span className="text-xs text-muted-foreground font-semibold">
            {totalSurveysIn}/{totalSurveysOut} peer surveys received
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Empty state ─────────────────────────────────────────────── */}
        {userSkills.length === 0 && (
          <div className="nudge-card rounded-2xl p-10 text-center max-w-xl mx-auto">
            <div className="text-5xl mb-3">🪞</div>
            <h2 className="text-lg font-black text-brand-dark">No Reality Checks yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Once you&apos;re enrolled in a skill and have a few coaching conversations,
              you&apos;ll be able to launch a Reality Check from here.
            </p>
            <Link
              href="/skills"
              className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-black hover:bg-brand-purple/90 transition-colors"
            >
              Go to My Skills
            </Link>
          </div>
        )}

        {/* ── Active rounds ───────────────────────────────────────────── */}
        {active.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              title="Active"
              subtitle="Surveys are out — finish picking raters or close the round when ready."
              count={active.length}
              accent="purple"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {active.map((us) => {
                const open = byUserSkill[us.id]?.open
                const counts = open ? inviteCounts[open.id] : undefined
                const totalInvited = counts?.total ?? us.surveys_sent ?? 0
                const responded = counts?.submitted ?? us.surveys_filled ?? 0
                const startedAt = open ? new Date(open.started_at) : null
                const elapsed = startedAt ? daysBetween(now, startedAt) : 0
                const remaining = Math.max(0, SOFT_DEADLINE_DAYS - elapsed)
                const canClose = responded >= 3 || elapsed >= SOFT_DEADLINE_DAYS

                return (
                  <Link
                    key={us.id}
                    href={`/skills/${us.id}/reality-check`}
                    className="nudge-card rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="text-2xl">{us.skill.icon || '🎯'}</div>
                        <div>
                          <div className="text-sm font-black text-brand-dark">{us.skill.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Round {us.rc_round || 1}
                          </div>
                        </div>
                      </div>
                      <PhasePill phase="training" />
                    </div>

                    {totalInvited === 0 ? (
                      <div className="rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 px-3 py-2 text-[11px] font-semibold text-brand-dark">
                        ✋ No raters yet — pick {3}–{8} colleagues to send the survey.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                          <span>{responded}/{totalInvited} responded</span>
                          <span>
                            {canClose
                              ? '✅ Ready to close'
                              : `${remaining} day${remaining === 1 ? '' : 's'} left`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-card-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-purple transition-all"
                            style={{
                              width: totalInvited
                                ? `${Math.min(100, (responded / totalInvited) * 100)}%`
                                : '0%',
                            }}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between mt-4 text-xs font-bold">
                      <span className="text-brand-purple">
                        {totalInvited === 0 ? 'Pick raters →' : canClose ? 'Close round →' : 'View progress →'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Past rounds ─────────────────────────────────────────────── */}
        {past.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              title="Past results"
              subtitle="Closed rounds with peer scores and themes."
              count={past.length}
              accent="green"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {past.map((us) => {
                const latest = byUserSkill[us.id]?.latest
                const closedAt = latest?.closed_at ? new Date(latest.closed_at) : null
                const closedDaysAgo = closedAt ? daysBetween(now, closedAt) : null
                const peerAvg = latest?.peer_avg_score ?? us.current_peer_avg
                const selfAvg = latest?.self_avg_score ?? us.current_self_avg
                const gap =
                  peerAvg != null && selfAvg != null ? peerAvg - selfAvg : null

                return (
                  <Link
                    key={us.id}
                    href={`/skills/${us.id}/results`}
                    className="nudge-card rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="text-2xl">{us.skill.icon || '🎯'}</div>
                        <div>
                          <div className="text-sm font-black text-brand-dark">{us.skill.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {closedDaysAgo === 0
                              ? 'Closed today'
                              : closedDaysAgo != null
                                ? `Closed ${closedDaysAgo} day${closedDaysAgo === 1 ? '' : 's'} ago`
                                : 'Closed'}
                          </div>
                        </div>
                      </div>
                      <PhasePill phase="post" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <ScoreBlock label="Self" value={selfAvg} />
                      <ScoreBlock label="Peer avg" value={peerAvg} accent="green" />
                      <ScoreBlock label="Gap" value={gap} signed />
                    </div>

                    <div className="text-xs font-bold text-brand-green">View detailed results →</div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Not yet started ─────────────────────────────────────────── */}
        {notYet.length > 0 && (
          <section>
            <SectionHeader
              title="Not yet started"
              subtitle="Have a few coaching conversations first — your AI coach will tell you when you&apos;re ready."
              count={notYet.length}
              accent="muted"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {notYet.map((us) => (
                <Link
                  key={us.id}
                  href={`/skills/${us.id}/chat`}
                  className="rounded-2xl border border-dashed border-card-border bg-card-muted/40 p-5 hover:border-brand-purple/40 hover:bg-white transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl opacity-70">{us.skill.icon || '🎯'}</div>
                      <div>
                        <div className="text-sm font-black text-brand-dark">{us.skill.name}</div>
                        <div className="text-[11px] text-muted-foreground">Pre-training phase</div>
                      </div>
                    </div>
                    <PhasePill phase="pre" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Self-rating unlocks once your coach has gathered enough context to make
                    the Reality Check meaningful.
                  </p>
                  <div className="text-xs font-bold text-brand-purple mt-3">Open chat →</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
  count,
  accent,
}: {
  title: string
  subtitle: string
  count: number
  accent: 'purple' | 'green' | 'muted'
}) {
  const accentMap = {
    purple: 'bg-brand-purple/10 text-brand-purple',
    green: 'bg-brand-green/10 text-brand-green',
    muted: 'bg-muted text-muted-foreground',
  }
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-base font-black text-brand-dark">{title}</h2>
          <span className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 ${accentMap[accent]}`}>
            {count}
          </span>
        </div>
        <p
          className="text-[11px] text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      </div>
    </div>
  )
}

function ScoreBlock({
  label,
  value,
  accent,
  signed,
}: {
  label: string
  value: number | null | undefined
  accent?: 'green'
  signed?: boolean
}) {
  const display =
    value == null
      ? '—'
      : signed
        ? `${value > 0 ? '+' : ''}${value.toFixed(1)}`
        : value.toFixed(1)
  return (
    <div className="rounded-lg bg-card-muted/60 px-2.5 py-2 text-center">
      <div className="text-[9px] font-extrabold tracking-wider uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-base font-black ${
          accent === 'green' ? 'text-brand-green' : 'text-brand-dark'
        }`}
      >
        {display}
      </div>
    </div>
  )
}
