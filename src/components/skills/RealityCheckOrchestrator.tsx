'use client'
// src/components/skills/RealityCheckOrchestrator.tsx
//
// Drives the Reality Check stepper for a given user_skill:
//   1. Self-rate
//   2. Pick peers + send anonymous links
//   3. Wait for peers; close the round once 3+ have responded
//
// All initial data is rendered on the server (the page component) so this
// stays lean and re-renders cleanly via router.refresh() after each action.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SkillDimension } from '@/lib/types'
import SelfRatingForm from '@/components/chat/SelfRatingForm'
import PeerSelectForm from '@/components/chat/PeerSelectForm'
import { RELATION_LABELS } from '@/lib/reality-check/helpers'

export interface RCOrchestratorInvite {
  id: string
  peer_email: string
  peer_name?: string | null
  peer_relation?: string | null
  token: string
  status: 'pending' | 'submitted' | 'expired'
  submitted_at?: string | null
  surveyUrl: string
}

interface Props {
  userSkillId: string
  skillName: string
  dimensions: SkillDimension[]
  selfRatings: Record<string, number> | null
  selfComments: string | null
  invites: RCOrchestratorInvite[]
  roundNumber: number | null
  startedAt: string | null
  /** True once the round is open (i.e. exists in reality_check_rounds). */
  roundActive: boolean
}

type Step = 'self' | 'peers' | 'wait'

export default function RealityCheckOrchestrator({
  userSkillId,
  skillName,
  dimensions,
  selfRatings,
  selfComments,
  invites,
  roundNumber,
  startedAt,
  roundActive,
}: Props) {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const submittedCount = useMemo(
    () => invites.filter((i) => i.status === 'submitted').length,
    [invites],
  )
  const hasSelf = !!selfRatings && Object.keys(selfRatings).length > 0
  const hasPeers = invites.length > 0

  const step: Step = !hasSelf ? 'self' : !hasPeers ? 'peers' : 'wait'

  const canClose = hasSelf && submittedCount >= 3

  async function handleClose() {
    if (!canClose) return
    setClosing(true)
    setCloseError(null)
    try {
      const res = await fetch('/api/reality-check/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSkillId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Could not close round')
      router.push(`/skills/${userSkillId}/results`)
      router.refresh()
    } catch (e: unknown) {
      setCloseError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setClosing(false)
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(url)
        setTimeout(() => setCopied(null), 1500)
      },
      () => undefined,
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Hero */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg,#623CEA,#3696FC)' }}
      >
        <div className="text-[10px] sm:text-xs font-extrabold tracking-[0.2em] opacity-80">
          REALITY CHECK · {roundNumber ? `ROUND ${roundNumber}` : 'NEW ROUND'}
        </div>
        <div className="text-xl sm:text-2xl font-black mt-2 leading-tight">
          📈 How does your team see you on{' '}
          <span className="text-yellow-300">{skillName}</span>?
        </div>
        <div className="text-sm mt-2 opacity-90 leading-relaxed">
          Two quick steps: rate yourself, then send anonymous links to 3-8 peers. Once 3
          respond you can close the round and see your gap report.
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stepper active={step === 'self'} done={hasSelf} label="1. Self-rate" />
          <Stepper active={step === 'peers'} done={hasPeers} label="2. Send to peers" />
          <Stepper active={step === 'wait'} done={canClose} label="3. Close round" />
        </div>
      </div>

      {/* Step 1: Self-rate */}
      {step === 'self' && (
        <SelfRatingForm
          userSkillId={userSkillId}
          dimensions={dimensions}
          initialRatings={selfRatings ?? undefined}
          initialComments={selfComments ?? undefined}
        />
      )}

      {/* Step 2: Pick peers */}
      {step === 'peers' && (
        <PeerSelectForm userSkillId={userSkillId} initialInvites={[]} />
      )}

      {/* Step 3: Wait + close */}
      {step === 'wait' && (
        <>
          {/* Self-rating recap (collapsed) */}
          {hasSelf && (
            <details className="nudge-card rounded-2xl p-5">
              <summary className="cursor-pointer text-sm font-bold text-brand-dark">
                ✅ Self-rating saved
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (click to edit)
                </span>
              </summary>
              <div className="mt-4">
                <SelfRatingForm
                  userSkillId={userSkillId}
                  dimensions={dimensions}
                  initialRatings={selfRatings ?? undefined}
                  initialComments={selfComments ?? undefined}
                />
              </div>
            </details>
          )}

          {/* Peer status */}
          <div className="nudge-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-purple uppercase">
                  Peer responses
                </div>
                <h3 className="text-base font-black text-brand-dark mt-1">
                  {submittedCount} of {invites.length} have responded
                </h3>
                {startedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Round opened {new Date(startedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  canClose
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'bg-brand-orange/10 text-brand-orange'
                }`}
              >
                {canClose ? 'Ready to close' : `Need ${Math.max(0, 3 - submittedCount)} more`}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {invites.map((inv) => {
                const submitted = inv.status === 'submitted'
                const relLabel = inv.peer_relation
                  ? RELATION_LABELS[inv.peer_relation] ?? inv.peer_relation
                  : 'Peer'
                return (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                      submitted
                        ? 'border-brand-green/30 bg-brand-green/5'
                        : 'border-card-border bg-white'
                    }`}
                  >
                    <div className="text-2xl">{submitted ? '✅' : '⏳'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-brand-dark truncate">
                        {inv.peer_name || inv.peer_email}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {relLabel} · {inv.peer_email}
                      </div>
                    </div>
                    {submitted ? (
                      <span className="text-[11px] font-bold text-brand-green">Done</span>
                    ) : (
                      <button
                        onClick={() => copyLink(inv.surveyUrl)}
                        className="text-[11px] font-bold text-brand-purple hover:underline whitespace-nowrap"
                      >
                        {copied === inv.surveyUrl ? '✓ Copied' : 'Copy link'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add more peers button */}
            <details className="mt-4">
              <summary className="text-xs font-bold text-brand-purple cursor-pointer hover:underline">
                + Add more peers
              </summary>
              <div className="mt-3">
                <PeerSelectForm userSkillId={userSkillId} initialInvites={[]} inline />
              </div>
            </details>
          </div>

          {/* Close round CTA */}
          <div className="nudge-card rounded-2xl p-6">
            <h3 className="text-base font-black text-brand-dark mb-1">Close round &amp; see results</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Computes your team average per dimension, clusters their open-text feedback into
              themes, and unlocks your action plan. You can do this any time after 3 peers
              have responded.
            </p>
            {closeError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold">
                {closeError}
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={!canClose || closing}
              className="w-full px-5 py-3 rounded-xl bg-brand-dark text-white text-sm font-black
                         hover:bg-brand-dark/90 active:scale-[0.99] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {closing
                ? 'Crunching numbers…'
                : canClose
                  ? '🎯 Close round & view report'
                  : `Waiting for ${Math.max(0, 3 - submittedCount)} more peer${
                      3 - submittedCount === 1 ? '' : 's'
                    }`}
            </button>
          </div>

          {/* Internal flag to surface roundActive in dev tools — silent in UI */}
          <span data-round-active={roundActive ? 'yes' : 'no'} className="hidden" />
        </>
      )}
    </div>
  )
}

function Stepper({
  active,
  done,
  label,
}: {
  active: boolean
  done: boolean
  label: string
}) {
  const tone = done
    ? 'bg-brand-green/20 text-white border-brand-green'
    : active
      ? 'bg-white/15 text-white border-white/40'
      : 'bg-white/5 text-white/60 border-white/10'
  return (
    <div className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold ${tone}`}>
      {done ? '✅ ' : ''}
      {label}
    </div>
  )
}
