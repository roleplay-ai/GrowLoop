'use client'
// src/components/chat/SelfRatingForm.tsx
//
// Step 1 of the Reality Check flow. Participant rates themselves 1-5 on each
// dimension. POSTs to /api/reality-check/self-rate which lazily creates the
// open round if one doesn't exist yet.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SkillDimension } from '@/lib/types'

interface Props {
  userSkillId: string
  dimensions: SkillDimension[]
  /** Pre-fill (e.g. when the user revisits the form mid-edit). */
  initialRatings?: Record<string, number>
  initialComments?: string
  inline?: boolean
  onSaved?: () => void
}

export default function SelfRatingForm({
  userSkillId,
  dimensions,
  initialRatings,
  initialComments,
  inline,
  onSaved,
}: Props) {
  const router = useRouter()
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings ?? {})
  const [comments, setComments] = useState(initialComments ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const allRated = dimensions.every((d) => ratings[d.id] >= 1 && ratings[d.id] <= 5)
  const ratedCount = dimensions.filter((d) => ratings[d.id] >= 1).length

  async function handleSave() {
    if (!allRated || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reality-check/self-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSkillId,
          ratings,
          comments: comments.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Could not save')
      setSavedAt(Date.now())
      onSaved?.()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={
        inline
          ? 'rounded-2xl border border-card-border bg-white p-5'
          : 'nudge-card rounded-2xl p-6'
      }
    >
      <div className="mb-4">
        <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-purple uppercase">
          Reality Check · Step 1 of 2
        </div>
        <h3 className="text-base font-black text-brand-dark mt-1">📈 Rate yourself</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Honest baseline 1-5 on each dimension. This is what we&apos;ll compare your
          team&apos;s answers to.
        </p>
      </div>

      <div className="space-y-5 mb-4">
        {dimensions.map((d) => (
          <div key={d.id}>
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
                    className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all border-2 ${
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

      <details className="mb-3">
        <summary className="text-xs font-bold text-brand-purple cursor-pointer hover:underline">
          + Add a note (optional)
        </summary>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. I rated myself low on visibility because I rarely share work-in-progress."
          className="mt-2 w-full p-3 rounded-lg border border-card-border text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        />
      </details>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-brand-green/10 border border-brand-green/20 text-xs text-brand-green font-semibold">
          ✅ Self-rating saved.
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!allRated || submitting}
        className="w-full px-5 py-3 rounded-xl bg-brand-purple text-white text-sm font-black
                   hover:bg-brand-purple/90 active:scale-[0.99] transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? 'Saving…'
          : allRated
            ? '✅ Save self-rating & continue'
            : `Rate all dimensions (${ratedCount}/${dimensions.length})`}
      </button>
    </div>
  )
}
