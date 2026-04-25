'use client'
// src/components/chat/ConversationSummaryModal.tsx
//
// "End conversation" popup. Recaps everything the agent intel has captured
// (the structured profile JSONB filled by Haiku's record_intel_slot tool)
// and offers two CTAs: dismiss, or wrap this conversation up and start a
// fresh one.

import { useEffect, useState } from 'react'
import { X, Sparkles, RefreshCw, MessageSquarePlus, CheckCircle2 } from 'lucide-react'
import {
  SLOTS,
  SECTIONS,
  countCaptured,
  type IntelProfile,
} from '@/lib/agent/slots'

interface Props {
  open: boolean
  onClose: () => void
  /** Latest profile mirror; if absent, the modal fetches its own copy. */
  profile?: IntelProfile | null
  userSkillId: string
  skillName: string
  skillIcon?: string
  /** Number of user+assistant turns in the conversation we're closing. */
  turnCount: number
  /** Triggered when "Start a new conversation" is clicked. */
  onStartNew: () => void | Promise<void>
  /** External "creating new conversation" indicator. */
  starting?: boolean
}

export default function ConversationSummaryModal({
  open,
  onClose,
  profile: profileProp,
  userSkillId,
  skillName,
  skillIcon,
  turnCount,
  onStartNew,
  starting,
}: Props) {
  const [profile, setProfile] = useState<IntelProfile | null>(profileProp ?? null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setProfile(profileProp ?? null)
  }, [profileProp])

  // If the parent didn't pass a profile, pull the latest on open so the
  // recap is always fresh after the most recent tool call.
  useEffect(() => {
    if (!open) return
    if (profileProp) {
      setProfile(profileProp)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/intel/profile?userSkillId=${encodeURIComponent(userSkillId)}`)
        if (!r.ok) return
        const j = (await r.json()) as { profile?: IntelProfile }
        if (!cancelled) setProfile(j?.profile ?? {})
      } catch {
        // soft-fail; modal still renders with empty/known profile
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, profileProp, userSkillId])

  // Esc-to-close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const { captured, total, pct } = countCaptured(profile)
  const capturedSlots = SLOTS.filter((s) => profile?.[s.key]?.trim())
  const missingSlots = SLOTS.filter((s) => !profile?.[s.key]?.trim())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-card-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-card-border bg-gradient-to-br from-brand-cream/50 to-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-[#8a6bff] flex items-center justify-center text-white text-lg shadow-lg shadow-brand-purple/30 flex-shrink-0">
            {skillIcon ?? '🧠'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">
              Conversation Summary
            </p>
            <h2 className="text-sm font-black text-brand-dark truncate">{skillName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-brand-cream transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="px-5 pt-4 pb-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-card-border bg-white px-3 py-2.5">
            <div className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-muted-foreground mb-0.5">
              Messages
            </div>
            <div className="text-lg font-black text-brand-dark leading-none">{turnCount}</div>
          </div>
          <div className="rounded-xl border border-card-border bg-white px-3 py-2.5">
            <div className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-muted-foreground mb-0.5">
              Intel captured
            </div>
            <div className="text-lg font-black text-brand-dark leading-none">
              {captured}
              <span className="text-xs font-bold text-muted-foreground/70">/{total}</span>
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="mx-5 mb-4 mt-1">
          <div className="bg-brand-dark/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg,#623CEA,#23CE68)',
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 chat-scroll">
          {loading && !profile ? (
            <div className="text-xs text-muted-foreground py-8 text-center">Loading…</div>
          ) : capturedSlots.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-3xl mb-2">🌱</div>
              <p className="text-sm font-bold text-brand-dark mb-1">
                No intel captured yet
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tell Nudge a bit about your role, level, and goals — it'll be
                saved here as you chat.
              </p>
            </div>
          ) : (
            <>
              {SECTIONS.map((section) => {
                const slotsInSection = SLOTS.filter((s) => s.section === section.key)
                const hasAny = slotsInSection.some((s) => profile?.[s.key]?.trim())
                if (!hasAny && section.key === 'role') return null

                return (
                  <div key={section.key} className="mb-3">
                    <div
                      className="flex items-center gap-1.5 mb-1.5 px-1 text-[9px] font-extrabold uppercase tracking-[1.2px]"
                      style={{ color: section.color }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: section.color }}
                      />
                      {section.icon} {section.label}
                    </div>

                    {/* Active skill always shown for the goal section */}
                    {section.key === 'goal' && (
                      <SummaryRow icon="🎯" label="Active Skill" value={skillName} />
                    )}

                    {slotsInSection
                      .filter((s) => profile?.[s.key]?.trim())
                      .map((s) => (
                        <SummaryRow
                          key={s.key}
                          icon={s.icon}
                          label={s.label}
                          value={profile![s.key]!}
                        />
                      ))}
                  </div>
                )
              })}

              {missingSlots.length > 0 && (
                <div className="mt-2 pt-3 border-t border-card-border">
                  <div className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-muted-foreground mb-1.5 px-1">
                    Still to capture
                  </div>
                  <ul className="space-y-1 px-1">
                    {missingSlots.map((s) => (
                      <li
                        key={s.key}
                        className="text-[11px] text-muted-foreground/80 leading-snug flex items-center gap-1.5"
                      >
                        <span className="opacity-60">{s.icon}</span>
                        {s.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-card-border bg-brand-cream/30 flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Saved to your private memory
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={starting}
              className="text-xs font-bold px-3 py-2 rounded-lg text-brand-dark hover:bg-brand-dark/[0.05] transition-colors disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={() => onStartNew()}
              disabled={starting}
              className="text-xs font-black px-3.5 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand-dark/90 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {starting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Start new conversation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl px-3 py-2 mb-1.5 bg-white border border-brand-dark/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-1.5 mb-0.5 text-[9px] font-extrabold uppercase tracking-[0.8px] text-brand-orange">
        <CheckCircle2 className="w-3 h-3 text-brand-green" />
        <span>
          {icon} {label}
        </span>
      </div>
      <p className="text-xs text-brand-dark leading-snug pl-[18px]">{value}</p>
    </div>
  )
}
