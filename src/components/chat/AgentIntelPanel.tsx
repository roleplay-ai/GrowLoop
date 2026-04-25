'use client'
// src/components/chat/AgentIntelPanel.tsx
//
// Side panel that mirrors the L&D HTML reference. Renders the structured
// slots from agent_intel.profile (jsonb) as captured / pending cards, with
// inline edit-on-click via chips + textarea.
//
// Each card is self-contained: clicking the pencil icon swaps the card into
// edit mode. Saving POSTs to /api/intel/answer and broadcasts an
// `agent-intel:update` event so the chat (and any other listeners) can stay
// in sync.

import { useEffect, useRef, useState } from 'react'
import { Lock, Sparkles, Pencil, Check, X, RefreshCw } from 'lucide-react'
import {
  SLOTS,
  SECTIONS,
  countCaptured,
  journeyProgress,
  type IntelProfile,
  type SlotDef,
  type SlotKey,
} from '@/lib/agent/slots'

interface Props {
  userSkillId: string
  profile: IntelProfile | null
  skillName: string
  conversations: Array<{ id: string; created_at: string; phase: string; preview?: string }>
  activeConversationId?: string
  onPickConversation?: (id: string) => void
  onNewConversation?: () => void
  /** Slot keys whose value changed in the most recent save (for animation). */
  recentlyCaptured?: SlotKey[]
  /** Called after a slot is saved so the wrapper can update state + emit events. */
  onSlotSaved?: (profile: IntelProfile) => void
}

const PHASE_DOT: Record<string, string> = {
  pre: 'bg-brand-orange',
  training: 'bg-brand-purple',
  post: 'bg-brand-green',
}

export default function AgentIntelPanel({
  userSkillId,
  profile,
  skillName,
  conversations,
  activeConversationId,
  onPickConversation,
  onNewConversation,
  recentlyCaptured = [],
  onSlotSaved,
}: Props) {
  const { captured, total, pct } = countCaptured(profile)
  const journey = journeyProgress(profile)

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-card-border bg-white">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base leading-none">🧠</span>
          <h3 className="text-xs font-extrabold tracking-[0.3px] text-brand-dark">Agent Intel</h3>
          <span className="ml-auto text-[9px] font-extrabold text-white bg-brand-purple rounded-full px-2 py-0.5">
            {captured}/{total} captured
          </span>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-[11px] leading-relaxed font-medium text-brand-dark border"
          style={{
            background: 'linear-gradient(90deg,#FFFBEE,#FFF3CF)',
            borderColor: 'rgba(255,206,0,0.35)',
          }}
        >
          Your coach captures context as you chat. It{' '}
          <strong className="text-brand-orange font-extrabold">
            adapts every nudge, plan & message
          </strong>{' '}
          to you. Click any card to edit.
        </div>
      </div>

      {/* ── Completion bar ─────────────────────────────────────── */}
      <div className="mx-3 mt-3 mb-1 bg-brand-dark/[0.06] rounded-full h-1 overflow-hidden">
        <div
          className="h-1 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg,#623CEA,#23CE68)',
          }}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 pt-2 pb-4">
        {SECTIONS.map((section) => {
          const slots = SLOTS.filter((s) => s.section === section.key)
          return (
            <div key={section.key}>
              <PhaseHeader color={section.color} icon={section.icon} label={section.label} />

              {/* The active skill is always known — render it as a static
                  captured card at the top of the goal section. */}
              {section.key === 'goal' && (
                <IntelSlotCard
                  staticValue={skillName}
                  staticIcon="🎯"
                  staticLabel="Active Skill"
                  staticHint="The skill you're growing in this loop"
                />
              )}

              {slots.map((slot) => (
                <IntelSlotCard
                  key={slot.key}
                  userSkillId={userSkillId}
                  slot={slot}
                  value={profile?.[slot.key]}
                  fresh={recentlyCaptured.includes(slot.key)}
                  skillName={skillName}
                  onSaved={(p) => onSlotSaved?.(p)}
                />
              ))}

              {/* Journey progress — read-only, computed */}
              {section.key === 'goal' && (
                <JourneyProgressCard percent={journey} />
              )}
            </div>
          )
        })}

        {/* Sessions list */}
        <div className="mt-5 pt-4 border-t border-card-border">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h4 className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-muted-foreground">
              Sessions ({conversations.length})
            </h4>
            {onNewConversation && (
              <button
                onClick={onNewConversation}
                className="text-[10px] font-bold text-brand-purple hover:bg-brand-purple/5 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> New
              </button>
            )}
          </div>
          {conversations.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic px-1">No prior sessions yet</p>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId
                return (
                  <button
                    key={c.id}
                    onClick={() => onPickConversation?.(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-brand-dark border-brand-dark text-white'
                        : 'bg-white border-card-border hover:border-brand-purple/40 hover:bg-brand-cream/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          PHASE_DOT[c.phase] ?? 'bg-brand-dark'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider ${
                          isActive ? 'text-white/60' : 'text-muted-foreground'
                        }`}
                      >
                        {c.phase}
                      </span>
                      <span
                        className={`ml-auto text-[10px] font-mono ${
                          isActive ? 'text-white/50' : 'text-muted-foreground/60'
                        }`}
                      >
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p
                      className={`text-xs leading-snug line-clamp-2 ${
                        isActive ? 'text-white/90' : 'text-brand-dark/80'
                      }`}
                    >
                      {c.preview || 'New conversation'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-card-border bg-brand-cream/30 flex items-center gap-2">
        <Lock className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-tight">
          Your memory is private. HR sees aggregated themes only.
        </p>
      </div>
    </>
  )
}

function PhaseHeader({ color, icon, label }: { color: string; icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 pt-2.5 pb-1.5 px-1 sticky top-0 bg-white z-10">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[9px] font-extrabold tracking-[1.2px] uppercase text-muted-foreground">
        {icon} {label}
      </span>
      <span className="flex-1 h-px bg-brand-dark/[0.07]" />
    </div>
  )
}

/* ─── Slot card with inline edit-on-click ──────────────────────── */
function IntelSlotCard(
  props:
    | {
        // Editable, profile-backed slot card
        userSkillId: string
        slot: SlotDef
        value?: string
        fresh?: boolean
        skillName: string
        onSaved?: (profile: IntelProfile) => void
        staticValue?: never
        staticIcon?: never
        staticLabel?: never
        staticHint?: never
      }
    | {
        // Read-only static card (e.g. Active Skill)
        staticValue: string
        staticIcon: string
        staticLabel: string
        staticHint: string
        userSkillId?: never
        slot?: never
        value?: never
        fresh?: never
        skillName?: never
        onSaved?: never
      },
) {
  // Static card — render and bail.
  if ('staticValue' in props && props.staticValue !== undefined) {
    return (
      <div className="rounded-xl px-2.5 py-2.5 mb-1.5 border bg-white border-brand-dark/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="text-[9px] font-extrabold uppercase tracking-[0.8px] text-brand-orange mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />
          <span>
            {props.staticIcon} {props.staticLabel}
          </span>
        </div>
        <p className="text-xs text-brand-dark leading-snug">{props.staticValue}</p>
      </div>
    )
  }

  const { userSkillId, slot, value, fresh, onSaved } = props as {
    userSkillId: string
    slot: SlotDef
    value?: string
    fresh?: boolean
    skillName: string
    onSaved?: (profile: IntelProfile) => void
  }

  const captured = !!(value && value.trim())
  const [editing, setEditing] = useState(false)
  const [pendingFreeText, setPendingFreeText] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  function startEdit() {
    setDraft(value ?? '')
    setPendingFreeText(captured ? true : false)
    setEditing(true)
    setErr(null)
    setTimeout(() => taRef.current?.focus(), 0)
  }
  function cancelEdit() {
    setEditing(false)
    setPendingFreeText(false)
    setErr(null)
  }

  async function commit(nextValue: string) {
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/intel/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSkillId, slot: slot.key, value: nextValue }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { profile: IntelProfile }
      onSaved?.(j.profile)
      window.dispatchEvent(new CustomEvent('agent-intel:update', { detail: j.profile }))
      setEditing(false)
      setPendingFreeText(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  const baseCard =
    'group relative rounded-xl px-2.5 py-2.5 mb-1.5 border transition-all duration-150 animate-fade-up'
  const stateCard = captured
    ? 'bg-white border-brand-dark/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-brand-yellow/60 hover:shadow-[0_2px_10px_rgba(255,206,0,0.12)]'
    : 'bg-[#FAFAF7] border-brand-dark/[0.07] opacity-70 hover:opacity-100 hover:bg-white'
  const freshCard = fresh ? 'ring-2 ring-brand-yellow/70 shadow-glow-yellow animate-pop-in' : ''

  return (
    <div
      className={`${baseCard} ${stateCard} ${freshCard} ${editing ? 'border-brand-purple/50 bg-white' : ''}`}
    >
      <div className="text-[9px] font-extrabold uppercase tracking-[0.8px] text-brand-orange mb-1 flex items-center gap-1.5">
        {captured && <span className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />}
        <span>
          {slot.icon} {slot.label}
        </span>
        {fresh && (
          <span className="ml-auto text-[8px] font-extrabold uppercase tracking-[1.2px] text-brand-yellow bg-brand-yellow/15 border border-brand-yellow/40 rounded-full px-1.5 py-px">
            Just captured
          </span>
        )}
        {!fresh && !editing && (
          <button
            onClick={startEdit}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-brand-purple p-0.5"
            title={captured ? 'Edit' : 'Fill in'}
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-1">
          {slot.chips?.length && !pendingFreeText ? (
            <>
              <div className="flex gap-1.5 flex-wrap">
                {slot.chips.map((chip) => (
                  <button
                    key={chip.value}
                    disabled={busy}
                    onClick={() => {
                      if (chip.free) {
                        setPendingFreeText(true)
                        setTimeout(() => taRef.current?.focus(), 0)
                        return
                      }
                      commit(chip.value)
                    }}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-brand-purple/25 text-brand-purple bg-white hover:bg-brand-purple hover:text-white hover:border-brand-purple transition-all active:scale-95 disabled:opacity-50"
                  >
                    {chip.label ?? chip.value}
                  </button>
                ))}
              </div>
              <button
                onClick={cancelEdit}
                className="mt-2 text-[10px] font-bold text-muted-foreground hover:text-brand-dark"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <textarea
                ref={taRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    commit(draft)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelEdit()
                  }
                }}
                rows={2}
                placeholder={slot.hint}
                disabled={busy}
                className="w-full resize-none px-2 py-1.5 rounded-md border border-brand-purple/30 text-xs text-brand-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple bg-white"
              />
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  onClick={() => commit(draft)}
                  disabled={busy || !draft.trim()}
                  className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-dark text-white hover:bg-brand-dark/90 disabled:opacity-40"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={busy}
                  className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:bg-brand-dark/[0.05]"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                {slot.chips?.length && (
                  <button
                    onClick={() => setPendingFreeText(false)}
                    disabled={busy}
                    className="ml-auto text-[10px] font-bold text-brand-purple hover:underline"
                  >
                    ← back to options
                  </button>
                )}
              </div>
            </>
          )}
          {err && <p className="text-[10px] text-brand-red mt-1">{err}</p>}
        </div>
      ) : captured ? (
        <button
          onClick={startEdit}
          className="text-left w-full text-xs text-brand-dark leading-snug hover:underline decoration-brand-purple/30 underline-offset-2"
        >
          {value}
        </button>
      ) : (
        <button onClick={startEdit} className="text-left w-full">
          <p className="text-[11px] font-medium italic text-[#B4B2A9] leading-snug">{slot.hint}</p>
          <p className="text-[10px] font-bold text-brand-purple mt-1 inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Tap to fill
          </p>
        </button>
      )}
    </div>
  )
}

function JourneyProgressCard({ percent }: { percent: number }) {
  return (
    <div className="rounded-xl px-2.5 py-2.5 mb-1.5 border bg-white border-brand-dark/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="text-[9px] font-extrabold uppercase tracking-[0.8px] text-brand-orange mb-1.5 flex items-center gap-1.5">
        <span>⚡ Journey Progress</span>
        <span className="ml-auto text-[10px] font-extrabold text-brand-purple">{percent}%</span>
      </div>
      <div className="bg-brand-dark/[0.06] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg,#623CEA,#23CE68)',
          }}
        />
      </div>
    </div>
  )
}
