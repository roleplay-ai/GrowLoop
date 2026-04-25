'use client'
import { RefreshCw, Lock, Sparkles } from 'lucide-react'

interface AgentIntel {
  current_level?: string | null
  context?: string | null
  motivations?: string[] | null
  blockers?: string[] | null
  raw_summary?: string | null
  updated_at?: string
}

type IntelKey = 'current_level' | 'context' | 'motivations' | 'blockers' | 'raw_summary'

interface Props {
  intel: AgentIntel | null
  skillName: string
  conversations: Array<{ id: string; created_at: string; phase: string; preview?: string }>
  activeConversationId?: string
  onPickConversation?: (id: string) => void
  onNewConversation?: () => void
  /** True while a background extraction call is in flight. */
  capturing?: boolean
  /** Keys whose value changed in the latest extraction; used for a brief flash. */
  recentlyCaptured?: IntelKey[]
}

const PHASE_DOT: Record<string, string> = {
  pre: 'bg-brand-orange',
  training: 'bg-brand-purple',
  post: 'bg-brand-green',
}

export default function AgentIntelPanel({
  intel,
  skillName,
  conversations,
  activeConversationId,
  onPickConversation,
  onNewConversation,
  capturing = false,
  recentlyCaptured = [],
}: Props) {
  const hasPersonal = !!(intel?.raw_summary && intel.raw_summary.trim())
  const hasLevel = !!(intel?.current_level && intel.current_level.trim())
  const hasContext = !!(intel?.context && intel.context.trim())
  const motivations = intel?.motivations ?? []
  const blockers = intel?.blockers ?? []

  // Captured count + completion (mirror HTML: personal + 4 slots = 5 total)
  const slots = [hasPersonal, hasLevel, hasContext, motivations.length > 0, blockers.length > 0]
  const captured = slots.filter(Boolean).length
  const total = slots.length
  const pct = Math.round((captured / total) * 100)

  const isFresh = (k: IntelKey) => recentlyCaptured.includes(k)

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-card-border bg-white">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base leading-none">🧠</span>
          <h3 className="text-xs font-extrabold tracking-[0.3px] text-brand-dark">Agent Intel</h3>
          {capturing ? (
            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-white bg-brand-purple rounded-full px-2 py-0.5">
              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              Capturing
            </span>
          ) : (
            <span className="ml-auto text-[9px] font-extrabold text-white bg-brand-purple rounded-full px-2 py-0.5">
              {captured} captured
            </span>
          )}
        </div>
        {/* Yellow gradient context pill — copy from HTML */}
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
          to you.
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
        {/* Personal Context — gold card, always first */}
        <IntelItem
          captured={hasPersonal}
          fresh={isFresh('raw_summary')}
          icon="✍️"
          label="Personal Context"
          gold
          value={intel?.raw_summary}
          hint={`Add context about ${skillName} — your role, goals, challenges. The agent uses this in every conversation.`}
        />

        {/* Phase: What Coach Knows */}
        <PhaseHeader color="#3696FC" icon="👤" label="Your Profile" />
        <IntelItem
          captured={hasLevel}
          fresh={isFresh('current_level')}
          icon="📍"
          label="Current Level"
          value={intel?.current_level}
          hint="Your familiarity with this skill"
        />
        <IntelItem
          captured={hasContext}
          fresh={isFresh('context')}
          icon="🏢"
          label="Your Context"
          value={intel?.context}
          hint="Role, team, situation"
        />

        {/* Phase: Goals & Challenges */}
        <PhaseHeader color="#F68A29" icon="🎯" label="Goals & Challenges" />
        <IntelItem
          captured={motivations.length > 0}
          fresh={isFresh('motivations')}
          icon="🌟"
          label="Why This Skill Matters"
          listValue={motivations}
          hint="What mastering this unlocks for you"
        />
        <IntelItem
          captured={blockers.length > 0}
          fresh={isFresh('blockers')}
          icon="🚧"
          label="What's Holding You Back"
          listValue={blockers}
          hint='e.g. "No time", "Feels awkward", "No feedback"'
        />

        {intel?.updated_at && (
          <p className="text-[10px] text-muted-foreground/60 font-mono pt-3 px-1">
            Updated{' '}
            {new Date(intel.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}

        {/* Sessions list (Growloop-specific, kept) */}
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

/* ─── Phase header (HTML's `.intel-phase-header`) ──────────────── */
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

/* ─── Intel card (HTML's `.intel-item`) ────────────────────────── */
function IntelItem(props: {
  captured: boolean
  fresh?: boolean
  icon: string
  label: string
  value?: string | null
  listValue?: string[]
  hint: string
  gold?: boolean
}) {
  const { captured, fresh, icon, label, value, listValue, hint, gold } = props

  const baseCard =
    'rounded-xl px-2.5 py-2.5 mb-1.5 border transition-all duration-150 animate-fade-up'
  const stateCard = gold
    ? 'bg-gradient-to-br from-[#FFFBEE] to-[#FFF6CF] border-[rgba(255,206,0,0.4)]'
    : captured
      ? 'bg-white border-brand-dark/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-brand-yellow/60 hover:shadow-[0_2px_10px_rgba(255,206,0,0.12)]'
      : 'bg-[#FAFAF7] border-brand-dark/[0.07] opacity-60'
  const freshCard = fresh ? 'ring-2 ring-brand-yellow/70 shadow-glow-yellow animate-pop-in' : ''

  const labelColor = gold ? 'text-brand-orange' : 'text-brand-orange'

  return (
    <div className={`${baseCard} ${stateCard} ${freshCard}`}>
      <div className={`text-[9px] font-extrabold uppercase tracking-[0.8px] ${labelColor} mb-1 flex items-center gap-1.5`}>
        {captured && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />
        )}
        <span>
          {icon} {label}
        </span>
        {fresh && (
          <span className="ml-auto text-[8px] font-extrabold uppercase tracking-[1.2px] text-brand-yellow bg-brand-yellow/15 border border-brand-yellow/40 rounded-full px-1.5 py-px">
            Just captured
          </span>
        )}
      </div>
      {captured ? (
        listValue ? (
          <ul className="space-y-0.5 pl-0.5">
            {listValue.map((m, i) => (
              <li key={i} className="text-xs text-brand-dark leading-relaxed flex gap-1.5">
                <span className="text-brand-yellow font-bold">·</span>
                {m}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-brand-dark leading-snug">{value}</p>
        )
      ) : (
        <p className="text-[11px] font-medium italic text-[#B4B2A9] leading-snug">{hint}</p>
      )}
    </div>
  )
}
