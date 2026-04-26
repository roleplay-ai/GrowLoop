'use client'
// src/components/chat/PeerSelectForm.tsx
//
// Org-directory peer picker. Replaces the older free-form name+email form
// because peers are required to be participants in the same org. Used in:
//   1. /skills/[userSkillId]/reality-check (full-page step 2 of 2)
//   2. The chat (rendered as a floating card when phase='training' and no
//      invites have been sent yet for the current round)
//
// Flow:
//   Mount -> GET /api/org/peers (same-org directory)
//   User searches + ticks 3–8 colleagues, picks a relation per pick
//   Submit -> POST /api/reality-check/start with { userId, relation }[]
//   On success -> show shareable links view
//
// External (non-org) peers are not supported in the UI right now. The server
// route accepts them only when ALLOW_EXTERNAL_PEERS is set, so we keep the
// surface area small and the directory honest.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrgPeer {
  id: string
  name: string
  email: string
  title: string | null
  func: string | null
  role: 'participant' | 'hr' | 'super_admin'
  avatar_emoji: string | null
  avatar_color: string | null
}

interface SelectedPeer {
  userId: string
  relation: string
}

interface ExistingInvite {
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
  initialInvites?: ExistingInvite[]
  /** When true the form sits flush in chat (transparent bg, smaller padding). */
  inline?: boolean
  onStarted?: () => void
}

const MAX_PEERS = 8
const MIN_PEERS = 3

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function defaultRelation(_role: OrgPeer['role']): string {
  return 'peer'
}

export default function PeerSelectForm({
  userSkillId,
  initialInvites,
  inline,
  onStarted,
}: Props) {
  const router = useRouter()

  const [directory, setDirectory] = useState<OrgPeer[]>([])
  const [dirLoading, setDirLoading] = useState(true)
  const [dirError, setDirError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SelectedPeer[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invites, setInvites] = useState<ExistingInvite[]>(initialInvites ?? [])

  useEffect(() => {
    if (initialInvites?.length) setInvites(initialInvites)
  }, [initialInvites])

  // Pull the same-org directory.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/org/peers', { cache: 'no-store' })
        const data = await res.json()
        if (!alive) return
        if (!res.ok) throw new Error(data?.error ?? 'Could not load directory')
        setDirectory(data.peers ?? [])
      } catch (e: unknown) {
        if (!alive) return
        setDirError(e instanceof Error ? e.message : 'Could not load directory')
      } finally {
        if (alive) setDirLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Fast lookup by id.
  const dirById = useMemo(() => {
    const map: Record<string, OrgPeer> = {}
    for (const p of directory) map[p.id] = p
    return map
  }, [directory])

  // Filtered + sorted directory: selected stays at top.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return directory
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.title ?? '').toLowerCase().includes(q) ||
          (p.func ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [directory, query])

  function toggle(p: OrgPeer) {
    setSelected((sel) => {
      const idx = sel.findIndex((s) => s.userId === p.id)
      if (idx >= 0) return sel.filter((_, i) => i !== idx)
      if (sel.length >= MAX_PEERS) return sel
      return [...sel, { userId: p.id, relation: defaultRelation(p.role) }]
    })
  }

  function remove(userId: string) {
    setSelected((sel) => sel.filter((s) => s.userId !== userId))
  }

  const canSubmit = selected.length >= MIN_PEERS && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reality-check/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSkillId,
          peers: selected.map((s) => ({ userId: s.userId, relation: s.relation })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Could not start round')

      setInvites(data.invites ?? [])
      onStarted?.()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submitted view: survey requests sent ────────────────────────────────
  if (invites.length > 0) {
    const submittedCount = invites.filter((i) => i.status === 'submitted').length
    return (
      <div
        className={
          inline
            ? 'rounded-2xl border border-card-border bg-white p-5'
            : 'nudge-card rounded-2xl p-6'
        }
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📬</div>
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-green uppercase mb-1">
            Requests sent
          </div>
          <h3 className="text-base font-black text-brand-dark">
            {invites.length} peer{invites.length === 1 ? '' : 's'} notified
          </h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
            Each peer will see the survey request in their <strong>Community</strong> page.
            Once {submittedCount >= 3 ? 'enough have' : '3+'} responded, you can close the round.
          </p>
        </div>

        <div className="mt-4 space-y-1.5">
          {invites.map((inv) => {
            const submitted = inv.status === 'submitted'
            return (
              <div
                key={inv.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${
                  submitted ? 'border-brand-green/30 bg-brand-green/5' : 'border-card-border bg-white/60'
                }`}
              >
                <span className="text-base">{submitted ? '✅' : '⏳'}</span>
                <span className="flex-1 text-xs font-bold text-brand-dark truncate">
                  {inv.peer_name || inv.peer_email}
                </span>
                <span className={`text-[11px] font-bold ${submitted ? 'text-brand-green' : 'text-muted-foreground'}`}>
                  {submitted ? 'Done' : 'Pending'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!dirLoading && !dirError && directory.length === 0) {
    return (
      <div
        className={
          inline
            ? 'rounded-2xl border border-card-border bg-white p-5'
            : 'nudge-card rounded-2xl p-6'
        }
      >
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🪑</div>
          <h3 className="text-base font-black text-brand-dark">No colleagues found yet</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
            Your HR admin hasn&apos;t added other participants to this organization yet. Once they
            do, you&apos;ll be able to pick raters here.
          </p>
        </div>
      </div>
    )
  }

  // ── Picker view ─────────────────────────────────────────────────────────
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
          Reality Check · Step 2 of 2
        </div>
        <h3 className="text-base font-black text-brand-dark mt-1">📡 Pick your raters</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Tick {MIN_PEERS}–{MAX_PEERS} colleagues from your organization who&apos;ve seen you in
          action. A mix of manager, peers, and reports gives the truest picture. Their answers
          are <strong>fully anonymous</strong>.
        </p>
      </div>

      {/* Search + counter */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, or function…"
            className="w-full px-3 py-2 pl-9 rounded-lg border border-card-border text-sm
                       bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            🔍
          </span>
        </div>
        <span
          className={`text-xs font-bold whitespace-nowrap ${
            selected.length >= MIN_PEERS ? 'text-brand-green' : 'text-muted-foreground'
          }`}
        >
          {selected.length}/{MIN_PEERS} ready
        </span>
      </div>

      {/* Directory grid — two-column cards */}
      <div className="max-h-80 overflow-y-auto mb-4 pr-0.5">
        {dirLoading && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading your organization&hellip;
          </div>
        )}
        {dirError && (
          <div className="px-3 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold">
            {dirError}
          </div>
        )}
        {!dirLoading && !dirError && filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No matches for &ldquo;{query}&rdquo;.
          </div>
        )}
        {!dirLoading && !dirError && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((p) => {
              const isSelected = selected.some((s) => s.userId === p.id)
              const atCapacity = !isSelected && selected.length >= MAX_PEERS
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border transition-all duration-150
                              ${isSelected
                                ? 'border-brand-purple bg-brand-purple/[0.07]'
                                : 'border-card-border bg-white'}
                              ${atCapacity ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {/* Clickable top area */}
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    disabled={atCapacity}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left disabled:cursor-not-allowed"
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-black"
                      style={{ backgroundColor: p.avatar_color ?? '#623CEA' }}
                    >
                      {p.avatar_emoji || initialsOf(p.name)}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-brand-dark truncate leading-tight">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate leading-tight">
                        {p.title || p.func || p.email}
                      </div>
                    </div>

                    {/* Check dot */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                                  text-[9px] font-black transition-all
                                  ${isSelected
                                    ? 'border-brand-purple bg-brand-purple text-white'
                                    : 'border-card-border bg-white text-transparent'}`}
                    >
                      ✓
                    </div>
                  </button>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full px-5 py-3 rounded-xl bg-brand-purple text-white text-sm font-black
                   hover:bg-brand-purple/90 active:scale-[0.99] transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? 'Sending…'
          : `📬 Send anonymous survey to ${selected.length || MIN_PEERS} peer${
              selected.length === 1 ? '' : 's'
            }`}
      </button>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Their identity is masked when results come back — you&apos;ll only see the team average.
      </p>
    </div>
  )
}
