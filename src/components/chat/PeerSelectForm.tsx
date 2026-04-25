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
import { RELATION_OPTIONS, RELATION_LABELS } from '@/lib/reality-check/helpers'

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

function defaultRelation(role: OrgPeer['role']): string {
  if (role === 'hr') return 'manager'
  if (role === 'super_admin') return 'manager'
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
  const [copied, setCopied] = useState<string | null>(null)

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
    const selectedIds = new Set(selected.map((s) => s.userId))
    const list = directory.filter((p) => {
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.title ?? '').toLowerCase().includes(q) ||
        (p.func ?? '').toLowerCase().includes(q)
      )
    })
    return list.sort((a, b) => {
      const aSel = selectedIds.has(a.id) ? 0 : 1
      const bSel = selectedIds.has(b.id) ? 0 : 1
      if (aSel !== bSel) return aSel - bSel
      return a.name.localeCompare(b.name)
    })
  }, [directory, query, selected])

  function toggle(p: OrgPeer) {
    setSelected((sel) => {
      const idx = sel.findIndex((s) => s.userId === p.id)
      if (idx >= 0) return sel.filter((_, i) => i !== idx)
      if (sel.length >= MAX_PEERS) return sel
      return [...sel, { userId: p.id, relation: defaultRelation(p.role) }]
    })
  }

  function setRelation(userId: string, relation: string) {
    setSelected((sel) => sel.map((s) => (s.userId === userId ? { ...s, relation } : s)))
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

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(url)
        setTimeout(() => setCopied(null), 1500)
      },
      () => undefined,
    )
  }

  // ── Submitted view: show the shareable links ─────────────────────────────
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
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-green uppercase">
              Round in progress
            </div>
            <h3 className="text-base font-black text-brand-dark mt-1">
              {invites.length} survey link{invites.length === 1 ? '' : 's'} ready to share
            </h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green">
            {submittedCount}/{invites.length} responded
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Email sending comes online in Phase 11. For now — copy each link and DM/email it to
          the peer. They&apos;ll respond anonymously.
        </p>
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
                  submitted ? 'border-brand-green/30 bg-brand-green/5' : 'border-card-border bg-white'
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

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-4 space-y-2">
          {selected.map((s) => {
            const peer = dirById[s.userId]
            if (!peer) return null
            return (
              <div
                key={s.userId}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-brand-purple/30 bg-brand-purple/5"
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-black"
                  style={{ backgroundColor: peer.avatar_color ?? '#623CEA' }}
                >
                  {peer.avatar_emoji || initialsOf(peer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-brand-dark truncate">{peer.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {peer.title || peer.func || peer.email}
                  </div>
                </div>
                <select
                  value={s.relation}
                  onChange={(e) => setRelation(s.userId, e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-card-border text-xs font-semibold
                             bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                >
                  {RELATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.emoji} {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(s.userId)}
                  className="text-muted-foreground hover:text-destructive text-sm font-bold px-1"
                  aria-label={`Remove ${peer.name}`}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

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

      {/* Directory list */}
      <div className="border border-card-border rounded-xl bg-card-muted/30 max-h-72 overflow-y-auto mb-4">
        {dirLoading && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Loading your organization&hellip;
          </div>
        )}
        {dirError && (
          <div className="px-4 py-3 text-xs text-destructive font-semibold">
            {dirError}
          </div>
        )}
        {!dirLoading && !dirError && filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No matches for &ldquo;{query}&rdquo;.
          </div>
        )}
        {!dirLoading && !dirError && filtered.length > 0 && (
          <ul className="divide-y divide-card-border/60">
            {filtered.map((p) => {
              const isSelected = selected.some((s) => s.userId === p.id)
              const atCapacity = !isSelected && selected.length >= MAX_PEERS
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    disabled={atCapacity}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                                ${isSelected ? 'bg-brand-purple/10' : 'hover:bg-card-muted/60'}
                                disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-black"
                      style={{ backgroundColor: p.avatar_color ?? '#623CEA' }}
                    >
                      {p.avatar_emoji || initialsOf(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-dark truncate">{p.name}</span>
                        {p.role !== 'participant' && (
                          <span className="text-[9px] font-extrabold tracking-wide uppercase rounded px-1.5 py-px bg-brand-yellow/20 text-brand-dark">
                            {p.role === 'hr' ? 'HR' : 'Admin'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {[p.title, p.func].filter(Boolean).join(' · ') || p.email}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] font-black
                                  ${isSelected
                                    ? 'border-brand-purple bg-brand-purple text-white'
                                    : 'border-card-border bg-white text-transparent'}`}
                    >
                      ✓
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
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
