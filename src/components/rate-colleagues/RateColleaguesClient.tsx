'use client'
// src/components/rate-colleagues/RateColleaguesClient.tsx

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SkillDimension } from '@/lib/types'

// ── DTOs (also exported for the server page) ─────────────────────────────────

export interface PendingDTO {
  inviteId: string
  token: string
  rateeId: string
  rateeName: string
  rateeEmoji: string | null
  rateeColor: string
  skillName: string
  skillIcon: string
}

export interface ConnectionSkillDTO {
  skillId: string
  skillName: string
  skillIcon: string
  dimensions: SkillDimension[]
}

export interface ConnectionDTO {
  userId: string
  name: string
  avatarEmoji: string | null
  avatarColor: string
  skills: ConnectionSkillDTO[]
}

export interface HistoryEntryDTO {
  id: string
  rateeId: string
  rateeName: string
  rateeEmoji: string | null
  rateeColor: string
  skillId: string
  skillName: string
  skillIcon: string
  avg: number
  comments: string | null
  createdAt: string
  superseded: boolean
  source?: 'peer_survey' | 'voluntary'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function Avatar({ name, emoji, color, size = 10 }: { name: string; emoji: string | null; color: string; size?: number }) {
  return (
    <div
      className={`rounded-full flex-shrink-0 flex items-center justify-center text-white font-black`}
      style={{
        width: size * 4,
        height: size * 4,
        fontSize: size * 1.1,
        backgroundColor: color,
      }}
    >
      {emoji || initials(name)}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalState {
  step: 'skill' | 'rate'
  connection: ConnectionDTO
  selectedSkill: ConnectionSkillDTO | null
  ratings: Record<string, number>
  comments: string
  submitting: boolean
  error: string | null
  done: boolean
}

function RatingModal({
  state,
  onClose,
  onSelectSkill,
  onRate,
  onSubmit,
  onComment,
}: {
  state: ModalState
  onClose: () => void
  onSelectSkill: (s: ConnectionSkillDTO) => void
  onRate: (dimId: string, val: number) => void
  onComment: (v: string) => void
  onSubmit: () => void
}) {
  const { connection, selectedSkill, ratings, comments, submitting, error, done, step } = state
  const allRated = selectedSkill
    ? selectedSkill.dimensions.every((d) => ratings[d.id] >= 1)
    : false

  return (
    <div
      className="fixed inset-0 bg-brand-dark/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-card-border">
          <Avatar name={connection.name} emoji={connection.avatarEmoji} color={connection.avatarColor} size={11} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-brand-dark truncate">
              {done ? 'Rating submitted!' : `Rate ${connection.name}`}
            </div>
            {selectedSkill && !done && (
              <div className="text-[11px] text-muted-foreground">
                {selectedSkill.skillIcon} {selectedSkill.skillName} · anonymous
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-brand-dark text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Done state */}
        {done && (
          <div className="px-5 py-10 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-sm font-bold text-brand-dark mb-1">Rating saved!</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your anonymous feedback helps {connection.name} grow.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-black hover:bg-brand-purple/90 transition-all"
            >
              Done
            </button>
          </div>
        )}

        {/* Skill picker */}
        {!done && step === 'skill' && (
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-brand-dark mb-3">Pick a skill to rate</p>
            <div className="grid grid-cols-2 gap-2">
              {connection.skills.map((s) => (
                <button
                  key={s.skillId}
                  onClick={() => onSelectSkill(s)}
                  className="flex flex-col items-start gap-1 p-3 rounded-xl border border-card-border bg-white
                             hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all text-left"
                >
                  <span className="text-2xl">{s.skillIcon}</span>
                  <span className="text-[12px] font-bold text-brand-dark leading-tight">{s.skillName}</span>
                </button>
              ))}
              {connection.skills.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground py-4 text-center">
                  {connection.name} hasn&apos;t added any skills yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rating form */}
        {!done && step === 'rate' && selectedSkill && (
          <div className="px-5 py-4 space-y-5">
            <div className="text-xs text-muted-foreground">1 = Low · 5 = High · Be honest, not nice.</div>

            {selectedSkill.dimensions.map((d) => (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-brand-dark">{d.name}</span>
                  <span className="text-sm font-black text-brand-purple">
                    {ratings[d.id] ? `${ratings[d.id]}/5` : '—'}
                  </span>
                </div>
                {d.description && (
                  <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{d.description}</p>
                )}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onRate(d.id, n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all border-2 ${
                        ratings[d.id] === n
                          ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                          : 'bg-white border-card-border text-brand-dark hover:border-brand-purple/40'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-1.5">
                Anything to add? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => onComment(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="One concrete behaviour helps more than generic praise…"
                className="w-full p-3 rounded-lg border border-card-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/30 resize-none"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={!allRated || submitting}
              className="w-full px-5 py-3 rounded-xl bg-brand-purple text-white text-sm font-black
                         hover:bg-brand-purple/90 active:scale-[0.99] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : allRated ? '🔒 Submit anonymously' : 'Rate all dimensions to continue'}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              🔒 Your name is never shown to {connection.name}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  pending: PendingDTO[]
  connections: ConnectionDTO[]
  ratingHistory: HistoryEntryDTO[]
}

export default function RateColleaguesClient({ pending, connections, ratingHistory }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState | null>(null)

  const openModal = useCallback((connection: ConnectionDTO) => {
    setModal({
      step: connection.skills.length === 1 ? 'rate' : 'skill',
      connection,
      selectedSkill: connection.skills.length === 1 ? connection.skills[0] : null,
      ratings: {},
      comments: '',
      submitting: false,
      error: null,
      done: false,
    })
  }, [])

  const closeModal = useCallback(() => {
    if (modal?.done) router.refresh()
    setModal(null)
  }, [modal, router])

  const handleSelectSkill = useCallback((s: ConnectionSkillDTO) => {
    setModal((prev) => prev ? { ...prev, step: 'rate', selectedSkill: s, ratings: {} } : null)
  }, [])

  const handleRate = useCallback((dimId: string, val: number) => {
    setModal((prev) => prev ? { ...prev, ratings: { ...prev.ratings, [dimId]: val } } : null)
  }, [])

  const handleComment = useCallback((v: string) => {
    setModal((prev) => prev ? { ...prev, comments: v } : null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!modal?.selectedSkill) return
    setModal((prev) => prev ? { ...prev, submitting: true, error: null } : null)
    try {
      const res = await fetch('/api/rate-colleague', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateeId: modal.connection.userId,
          skillId: modal.selectedSkill.skillId,
          ratings: modal.ratings,
          comments: modal.comments.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Could not save rating')
      setModal((prev) => prev ? { ...prev, submitting: false, done: true } : null)
    } catch (e) {
      setModal((prev) => prev ? {
        ...prev,
        submitting: false,
        error: e instanceof Error ? e.message : 'Something went wrong',
      } : null)
    }
  }, [modal])

  return (
    <>
      {modal && (
        <RatingModal
          state={modal}
          onClose={closeModal}
          onSelectSkill={handleSelectSkill}
          onRate={handleRate}
          onComment={handleComment}
          onSubmit={handleSubmit}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* How it works banner */}
        <div
          className="rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg,#623CEA,#3696FC)' }}
        >
          <div className="text-[10px] font-extrabold tracking-[0.2em] opacity-80 uppercase mb-1">
            ⭐ How this works
          </div>
          <p className="text-sm leading-relaxed opacity-95">
            Rate any colleague who has connected with you — anonymously, anytime. Every
            submission is saved. You can re-rate someone later to reflect their growth.
            Your name is never shown; only the team average reaches them.
          </p>
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div className="rounded-2xl border-2 border-brand-yellow bg-[#FFFBEF] p-4 space-y-3">
            <div className="text-[11px] font-extrabold text-[#8A7400] uppercase tracking-wider">
              🔔 {pending.length} pending rating {pending.length === 1 ? 'request' : 'requests'}
            </div>
            {pending.map((inv) => (
              <div
                key={inv.inviteId}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-brand-yellow/30"
              >
                <Avatar name={inv.rateeName} emoji={inv.rateeEmoji} color={inv.rateeColor} size={10} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-brand-dark truncate">
                    {inv.rateeName} asked you to rate them
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {inv.skillIcon} {inv.skillName}
                  </div>
                </div>
                <Link
                  href={`/peer-survey/${inv.token}`}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-black
                             hover:bg-brand-purple/90 transition-all whitespace-nowrap"
                >
                  Rate now →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Left: Rate a colleague */}
          <div className="nudge-card rounded-2xl p-5">
            <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-purple uppercase mb-1">
              👥 Rate a colleague (anytime)
            </div>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Anyone who has ever sent you a survey request. Ratings are anonymous.
            </p>

            {connections.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🤝</div>
                <p className="text-xs text-muted-foreground">
                  No connections yet. When a colleague picks you in their Reality Check,
                  they&apos;ll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {connections.map((c) => {
                  const lastRated = ratingHistory.find(
                    (h) => h.rateeId === c.userId && !h.superseded,
                  )
                  return (
                    <div
                      key={c.userId}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-card-border bg-white hover:border-brand-purple/30 transition-colors"
                    >
                      <Avatar name={c.name} emoji={c.avatarEmoji} color={c.avatarColor} size={9} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-brand-dark truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {lastRated
                            ? `Last rated: ${lastRated.skillIcon} ${lastRated.skillName} · ${lastRated.avg.toFixed(1)}/5`
                            : c.skills.map((s) => `${s.skillIcon} ${s.skillName}`).join(', ') || 'No skills yet'}
                        </div>
                      </div>
                      <button
                        onClick={() => openModal(c)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-brand-purple/40 text-brand-purple
                                   text-[11px] font-black hover:bg-brand-purple hover:text-white transition-all whitespace-nowrap"
                      >
                        Rate →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Rating history */}
          <div className="nudge-card rounded-2xl p-5">
            <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-purple uppercase mb-1">
              📜 My rating history
              <span className="text-muted-foreground font-semibold normal-case tracking-normal ml-1">
                ({ratingHistory.length} submissions)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Every rating you&apos;ve submitted. Re-rating marks older entries as superseded.
            </p>

            {ratingHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-xs text-muted-foreground">No ratings submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {ratingHistory.map((h) => (
                  <div
                    key={h.id}
                    className={`p-3 rounded-xl border transition-opacity ${
                      h.superseded ? 'border-card-border bg-white opacity-55' : 'border-card-border bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={h.rateeName} emoji={h.rateeEmoji} color={h.rateeColor} size={7} />
                      <span className="text-[12px] font-bold text-brand-dark">{h.rateeName}</span>
                      <span className="text-[10px] text-muted-foreground">· {h.skillIcon} {h.skillName}</span>
                      <span
                        className={`ml-auto text-[9px] font-extrabold px-1.5 py-px rounded-md ${
                          h.source === 'peer_survey'
                            ? 'bg-[#EEF3FF] text-brand-purple'
                            : h.superseded
                            ? 'bg-[#F5F2FB] text-muted-foreground'
                            : 'bg-[#E9F9EE] text-brand-green'
                        }`}
                      >
                        {h.source === 'peer_survey' ? 'Reality Check' : h.superseded ? 'superseded' : 'current'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-extrabold text-brand-purple">{h.avg.toFixed(1)}/5</span>
                      {h.comments && (
                        <span className="text-[10px] text-muted-foreground flex-1 truncate">
                          {h.comments}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
