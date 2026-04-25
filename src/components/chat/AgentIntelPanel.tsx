'use client'
import { Brain, Lightbulb, AlertCircle, Target, RefreshCw, Lock } from 'lucide-react'

interface AgentIntel {
  current_level?: string | null
  context?: string | null
  motivations?: string[] | null
  blockers?: string[] | null
  raw_summary?: string | null
  updated_at?: string
}

interface Props {
  intel: AgentIntel | null
  skillName: string
  conversations: Array<{ id: string; created_at: string; phase: string; preview?: string }>
  activeConversationId?: string
  onPickConversation?: (id: string) => void
  onNewConversation?: () => void
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
}: Props) {
  const hasIntel =
    intel &&
    (intel.current_level ||
      intel.context ||
      intel.motivations?.length ||
      intel.blockers?.length ||
      intel.raw_summary)

  return (
    <>
      {/* Header */}
      <div className="px-5 py-4 border-b border-card-border bg-gradient-to-br from-brand-cream to-white">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-brand-purple/10 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-brand-purple" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[2px] text-brand-dark">Coach Memory</h3>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          What Nudge has learned about you for{' '}
          <span className="font-bold text-brand-dark">{skillName}</span>
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto chat-scroll">
        {/* Intel section */}
        <div className="px-5 py-4 space-y-4 border-b border-card-border">
          {!hasIntel ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-brand-cream mx-auto mb-3 flex items-center justify-center">
                <Brain className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As you chat, Nudge will build a picture of your context, motivations, and blockers — and
                use it to tailor future sessions.
              </p>
            </div>
          ) : (
            <>
              {intel?.current_level && (
                <IntelBlock
                  icon={<Target className="w-3.5 h-3.5" />}
                  label="Current Level"
                  color="text-brand-purple bg-brand-purple/10"
                >
                  <p className="text-xs text-brand-dark leading-relaxed">{intel.current_level}</p>
                </IntelBlock>
              )}

              {intel?.context && (
                <IntelBlock
                  icon={<Brain className="w-3.5 h-3.5" />}
                  label="Context"
                  color="text-brand-dark bg-brand-cream"
                >
                  <p className="text-xs text-brand-dark leading-relaxed">{intel.context}</p>
                </IntelBlock>
              )}

              {!!intel?.motivations?.length && (
                <IntelBlock
                  icon={<Lightbulb className="w-3.5 h-3.5" />}
                  label="Motivations"
                  color="text-brand-yellow bg-brand-yellow/15"
                >
                  <ul className="space-y-1">
                    {intel.motivations.map((m, i) => (
                      <li key={i} className="text-xs text-brand-dark leading-relaxed flex gap-1.5">
                        <span className="text-brand-yellow font-black">·</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </IntelBlock>
              )}

              {!!intel?.blockers?.length && (
                <IntelBlock
                  icon={<AlertCircle className="w-3.5 h-3.5" />}
                  label="Blockers"
                  color="text-brand-red bg-brand-red/10"
                >
                  <ul className="space-y-1">
                    {intel.blockers.map((b, i) => (
                      <li key={i} className="text-xs text-brand-dark leading-relaxed flex gap-1.5">
                        <span className="text-brand-red font-black">·</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </IntelBlock>
              )}

              {intel?.updated_at && (
                <p className="text-[10px] text-muted-foreground/60 font-mono pt-2 border-t border-card-border">
                  Updated{' '}
                  {new Date(intel.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </>
          )}
        </div>

        {/* Conversations list */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">
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
            <p className="text-[11px] text-muted-foreground italic">No prior sessions yet</p>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId
                return (
                  <button
                    key={c.id}
                    onClick={() => onPickConversation?.(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group ${
                      isActive
                        ? 'bg-brand-dark border-brand-dark text-white'
                        : 'bg-white border-card-border hover:border-brand-purple/40 hover:bg-brand-cream/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${PHASE_DOT[c.phase] ?? 'bg-brand-dark'}`}
                      />
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${
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

      {/* Footer */}
      <div className="px-5 py-3 border-t border-card-border bg-brand-cream/30 flex items-center gap-2">
        <Lock className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-tight">
          Your memory is private. HR can see aggregated themes only.
        </p>
      </div>
    </>
  )
}

function IntelBlock({
  icon,
  label,
  color,
  children,
}: {
  icon: React.ReactNode
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-[1.5px] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  )
}
