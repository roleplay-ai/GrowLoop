'use client'
// src/app/peer-survey/[token]/PeerSurveyForm.tsx
//
// Anonymous peer rates the participant 1-5 on each dimension and can leave
// optional written feedback. Submission goes through the server action so
// the rater never has to authenticate.

import { useState } from 'react'
import type { SkillDimension } from '@/lib/types'
import { submitPeerRating } from './actions'

interface Props {
  token: string
  participantName: string
  skillName: string
  skillIcon?: string | null
  dimensions: SkillDimension[]
}

export default function PeerSurveyForm({
  token,
  participantName,
  skillName,
  skillIcon,
  dimensions,
}: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const allRated = dimensions.every((d) => ratings[d.id] >= 1 && ratings[d.id] <= 5)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const res = await submitPeerRating({ token, ratings, comments: comments.trim() || undefined })
    if (res.success) {
      setDone(true)
    } else {
      setError(res.error ?? 'Something went wrong')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-black text-brand-dark mb-2">Thanks for your honest feedback!</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your response is <strong>fully anonymous</strong> — only the aggregate score
          is shared with {participantName}. They&apos;ll use it to grow.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-20">
      <div
        className="rounded-2xl p-6 sm:p-8 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg,#623CEA,#3696FC)' }}
      >
        <div className="text-[10px] sm:text-xs font-extrabold tracking-[0.2em] opacity-80">
          ANONYMOUS PEER SURVEY
        </div>
        <h1 className="text-xl sm:text-2xl font-black mt-2 leading-tight">
          {skillIcon ?? '🧠'} Rate {participantName} on{' '}
          <span className="text-yellow-300">{skillName}</span>
        </h1>
        <p className="text-sm mt-3 opacity-90 leading-relaxed">
          You&apos;re helping {participantName} understand how peers experience this skill.
          Your name and ratings stay <strong>fully anonymous</strong> — only the team
          average is shared. No login required.
        </p>
      </div>

      <div className="nudge-card rounded-2xl p-5 sm:p-6 mb-4">
        <div className="text-sm font-bold text-brand-dark">Rate {participantName} on each dimension</div>
        <div className="text-xs text-muted-foreground mb-5">1 = Low · 5 = High · Be honest, not nice.</div>

        {dimensions.map((d) => (
          <div key={d.id} className="mb-5 last:mb-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-sm font-bold text-brand-dark">{d.name}</div>
              <div className="text-sm font-black text-brand-purple">
                {ratings[d.id] ? `${ratings[d.id]}/5` : '—'}
              </div>
            </div>
            {d.description && (
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{d.description}</p>
            )}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = ratings[d.id] === n
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatings((r) => ({ ...r, [d.id]: n }))}
                    className={`flex-1 py-3 rounded-lg text-sm font-extrabold transition-all border-2 ${
                      active
                        ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                        : 'bg-white border-card-border text-brand-dark hover:border-brand-purple/40'
                    }`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="nudge-card rounded-2xl p-5 sm:p-6 mb-4">
        <label className="block text-sm font-bold text-brand-dark mb-1">
          Anything you&apos;d like {participantName} to know? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          One concrete behaviour or moment helps more than generic praise.
        </p>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="e.g. The way you handled the launch retro — calm, clear, named the issue."
          className="w-full p-3 rounded-lg border border-card-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        />
        <div className="text-[10px] text-muted-foreground text-right mt-1">{comments.length}/2000</div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-semibold">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allRated || submitting}
        className="w-full px-6 py-4 rounded-xl bg-brand-purple text-white text-sm font-black
                   hover:bg-brand-purple/90 active:scale-[0.99] transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting…' : allRated ? '🔒 Submit anonymously' : 'Rate all dimensions to continue'}
      </button>

      <p className="text-center text-[11px] text-muted-foreground mt-4 leading-relaxed">
        🔒 Your identity is never shown to {participantName}. Only the team average across
        all peers is shared.
      </p>
    </div>
  )
}
