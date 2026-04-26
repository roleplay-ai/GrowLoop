'use client'
// src/components/chat/ChatWindow.tsx
//
// Pure AI-driven chat. Haiku handles the conversation end-to-end and
// records intel inline via the `record_intel_slot` tool. This component
// only:
//   * streams the visible text reply
//   * after each completed turn, refetches the structured profile so the
//     side-panel reflects whatever the model just saved
//   * stays in sync with side-panel edits via the `agent-intel:update`
//     event bus

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'
import { Send, Sparkles, Square, AlertTriangle, X, LogOut } from 'lucide-react'
import Markdown from './Markdown'
import ToolUseCard, { ToolEvent } from './ToolUseCard'
import ConversationSummaryModal from './ConversationSummaryModal'
import Link from 'next/link'
import { countCaptured, type IntelProfile } from '@/lib/agent/slots'

interface Props {
  userSkillId: string
  conversationId: string
  initialMessages: Message[]
  skillName: string
  skillIcon?: string
  phase: 'pre' | 'training' | 'post'
  initialProfile?: IntelProfile
}

const PHASE_META = {
  pre: {
    label: 'Discovery',
    color: 'bg-brand-orange/15 text-brand-orange border-brand-orange/30',
    dot: 'bg-brand-orange',
    greeting:
      "Hi! I'm **Nudge**, your AI coach for this skill. Tell me a bit about yourself and what you're hoping to get out of it.",
    suggestions: [
      "I'll tell you about my role",
      'Why this skill matters to me',
      "What's been holding me back",
      'Just start coaching me',
    ],
  },
  training: {
    label: 'Training',
    color: 'bg-brand-purple/15 text-brand-purple border-brand-purple/30',
    dot: 'bg-brand-purple',
    greeting:
      "Welcome back! Let's check in. \n\n**How have things been since we last spoke?** Any progress, wins, or sticky moments you'd like to talk about?",
    suggestions: [
      'I made progress',
      "I'm stuck on something",
      'Help me with my action plan',
      'What should I focus on next?',
    ],
  },
  post: {
    label: 'Reflection',
    color: 'bg-brand-green/15 text-brand-green border-brand-green/30',
    dot: 'bg-brand-green',
    greeting:
      "Your **Reality Check results** are in. Let's review them together — strengths first, then growth areas — and co-create your next action plan.",
    suggestions: [
      'Walk me through my results',
      'Where did I score highest?',
      'What should I work on?',
      'Help me build action items',
    ],
  },
} as const

interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: ToolEvent[]
  created_at: string
}

function CoachAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-br from-brand-purple via-brand-purple to-[#8a6bff] flex items-center justify-center text-white font-black shadow-lg shadow-brand-purple/30 flex-shrink-0 ring-2 ring-white`}
    >
      N
    </div>
  )
}

function UserAvatar({ initials, color, emoji }: { initials: string; color?: string; emoji?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ring-2 ring-white shadow-md"
      style={{ background: color ?? '#221D23' }}
    >
      {emoji ?? initials}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-purple/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  )
}

export default function ChatWindow({
  userSkillId,
  conversationId,
  initialMessages,
  skillName,
  skillIcon,
  phase,
  initialProfile,
}: Props) {
  const phaseMeta = PHASE_META[phase]
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const [turns, setTurns] = useState<ChatTurn[]>(
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      created_at: m.created_at,
    })),
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [streamTools, setStreamTools] = useState<ToolEvent[]>([])
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  // The chat keeps a local mirror of the structured profile so the
  // side panel and the "End conversation" summary modal stay in sync.
  // Haiku is the source of truth for what to ask next.
  const [profile, setProfile] = useState<IntelProfile>(initialProfile ?? {})
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [startingNew, setStartingNew] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showGreeting = turns.length === 0

  const scrollToBottom = (smooth = true) =>
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })

  useEffect(() => {
    scrollToBottom()
  }, [turns.length, loading])

  useEffect(() => {
    if (streaming) {
      const el = scrollRef.current
      if (!el) return
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
      if (nearBottom) scrollToBottom(false)
    }
  }, [streaming])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  // Listen for side-panel edits so our local profile mirror stays in sync.
  useEffect(() => {
    function onPanelUpdate(e: Event) {
      const detail = (e as CustomEvent<IntelProfile>).detail
      if (detail) setProfile(detail)
    }
    window.addEventListener('agent-intel:update', onPanelUpdate as EventListener)
    return () => window.removeEventListener('agent-intel:update', onPanelUpdate as EventListener)
  }, [])

  /**
   * Pull the latest profile JSONB from the server. Called once after every
   * completed assistant turn — picks up whatever Haiku just saved via the
   * record_intel_slot tool. Cheap GET; no extra LLM call.
   */
  async function refreshIntelProfile() {
    try {
      const r = await fetch(`/api/intel/profile?userSkillId=${encodeURIComponent(userSkillId)}`)
      if (!r.ok) return
      const j = (await r.json()) as { profile?: IntelProfile }
      if (j?.profile) {
        setProfile(j.profile)
        window.dispatchEvent(new CustomEvent('agent-intel:update', { detail: j.profile }))
      }
    } catch (err) {
      console.warn('[intel/profile] refresh failed:', err)
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setLoading(true)
    setStreamTools([])
    setErrorBanner(null)

    const userTurn: ChatTurn = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setTurns((prev) => [...prev, userTurn])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          userSkillId,
          conversationId,
          phase,
          skillName,
          message: content,
          history: turns.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        let msg = `Coach unavailable (HTTP ${res.status})`
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch {
          try {
            const t = await res.text()
            if (t) msg = t
          } catch {}
        }
        setErrorBanner(msg)
        setLoading(false)
        return
      }
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setStreaming(fullText)
      }

      const assistantTurn: ChatTurn = {
        id: `tmp-bot-${Date.now()}`,
        role: 'assistant',
        content: fullText,
        created_at: new Date().toISOString(),
      }
      setTurns((prev) => [...prev, assistantTurn])
      setStreaming('')
      setStreamTools([])

      await supabase.from('messages').insert([
        { conversation_id: conversationId, role: 'user', content },
        { conversation_id: conversationId, role: 'assistant', content: fullText },
      ])

      // Pick up any slot writes the model made via the tool side-channel.
      refreshIntelProfile()
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // user-cancelled
      } else {
        console.error(err)
        setErrorBanner(err?.message ?? 'Failed to reach the coach.')
      }
      setLoading(false)
      setStreaming('')
    }
  }

  function abort() {
    abortRef.current?.abort()
    setLoading(false)
    setStreaming('')
  }

  /**
   * "End conversation" → "Start new conversation" flow. Creates a fresh
   * conversation row for this user_skill and navigates to it. The current
   * conversation is preserved as a past session (visible in the side panel).
   */
  async function handleStartNew() {
    if (startingNew) return
    setStartingNew(true)
    try {
      const res = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { id } = await res.json()
      setSummaryOpen(false)
      router.push(`${pathname}?c=${id}`)
      router.refresh()
    } catch (err) {
      console.error('[start-new]', err)
      setErrorBanner('Could not start a new conversation. Try again.')
    } finally {
      setStartingNew(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-brand-cream/40">
      {/* Phase banner */}
      <div className="px-6 py-3 border-b border-card-border bg-white/70 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{skillIcon ?? '🧠'}</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-brand-dark">{skillName}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full border ${phaseMeta.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${phaseMeta.dot} animate-pulse`} />
                  {phaseMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Coached by Nudge · Your private AI growth partner
              </p>
            </div>
          </div>

          {turns.length > 0 && (
            <button
              onClick={() => setSummaryOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[1.2px] px-4 py-2 rounded-full bg-brand-red text-white border border-brand-red hover:bg-brand-red/90 hover:shadow-lg hover:shadow-brand-red/30 transition-all active:scale-95 shadow-md shadow-brand-red/25"
              aria-label="End conversation"
              title="End conversation and see summary"
            >
              <LogOut className="w-3.5 h-3.5" />
              End conversation
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="px-4 lg:px-8 pt-3">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-brand-red/5 border border-brand-red/25 text-brand-red text-xs animate-fade-up">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 leading-relaxed">
              <div className="font-black uppercase tracking-wider text-[10px] mb-0.5">
                Coach error
              </div>
              <p className="text-brand-dark/90">{errorBanner}</p>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="p-1 rounded hover:bg-brand-red/10 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll relative">
        <div className="px-4 lg:px-8 py-6 space-y-5">
          {showGreeting && (
            <div className="flex items-end gap-3 animate-fade-up">
              <CoachAvatar />
              <div className="max-w-[85%] bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-card">
                <Markdown>{phaseMeta.greeting}</Markdown>
              </div>
            </div>
          )}

          {turns.map((turn) => (
            <ChatTurnView key={turn.id} turn={turn} />
          ))}

          {(streaming || streamTools.length > 0) && (
            <div className="flex items-end gap-3 animate-fade-up">
              <CoachAvatar />
              <div className="max-w-[85%] bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-card">
                {streamTools.map((t) => (
                  <ToolUseCard key={t.id} event={t} />
                ))}
                {streaming && (
                  <div>
                    <Markdown>{streaming}</Markdown>
                    <span className="inline-block w-1 h-4 bg-brand-purple animate-pulse ml-0.5 align-middle rounded-sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && !streaming && streamTools.length === 0 && (
            <div className="flex items-end gap-3 animate-fade-up">
              <CoachAvatar />
              <div className="bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-card">
                <TypingDots />
              </div>
            </div>
          )}

          {/* Reality Check nudge — shown once all intel slots are captured */}
          {phase === 'pre' && countCaptured(profile).captured >= countCaptured(profile).total && (
            <div className="flex items-end gap-3 animate-fade-up">
              <CoachAvatar />
              <div
                className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3.5 text-sm leading-relaxed shadow-card border border-brand-green/30"
                style={{ background: 'linear-gradient(135deg,#F0FFF7 0%,#E8F5FF 100%)' }}
              >
                <div className="text-[10px] font-extrabold tracking-[0.15em] uppercase text-brand-green mb-1.5">
                  🎉 You&apos;re ready!
                </div>
                <p className="text-sm text-brand-dark leading-snug mb-3">
                  I&apos;ve got a solid picture of where you&apos;re at. The next step is a{' '}
                  <strong>Reality Check</strong> — I&apos;ll help you gather anonymous feedback
                  from colleagues so you can see how you&apos;re really showing up.
                </p>
                <Link
                  href={`/skills/${userSkillId}/reality-check`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-black hover:bg-brand-green/90 active:scale-[0.98] transition-all shadow-sm shadow-brand-green/30"
                >
                  🪞 Start Reality Check
                </Link>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick-reply chips on the very first turn */}
      {showGreeting && (
        <div className="w-full px-4 lg:px-8 pb-3">
          <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-muted-foreground uppercase tracking-[2px]">
            <Sparkles className="w-3 h-3" />
            Quick replies
          </div>
          <div className="flex gap-2 flex-wrap">
            {phaseMeta.suggestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs font-semibold px-3.5 py-2 rounded-full border border-brand-purple/25 text-brand-purple bg-white hover:bg-brand-purple hover:text-white hover:border-brand-purple transition-all active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-card-border bg-white px-4 lg:px-8 py-4">
        <div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={loading}
                placeholder={loading ? 'Nudge is responding…' : 'Message Nudge…  (Shift+Enter for new line)'}
                rows={1}
                className="w-full resize-none px-4 py-3 pr-12 rounded-xl border border-border text-sm text-brand-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/25 focus:border-brand-purple transition-all max-h-40 disabled:opacity-60 bg-brand-cream/30"
              />
              <span className="absolute bottom-2 right-3 text-[9px] font-mono text-muted-foreground/40 pointer-events-none">
                {input.length > 0 ? `${input.length}` : ''}
              </span>
            </div>
            {loading || streaming ? (
              <button
                onClick={abort}
                className="w-11 h-11 rounded-xl bg-brand-red text-white flex items-center justify-center hover:bg-brand-red/90 active:scale-95 transition-all flex-shrink-0 shadow-md"
                aria-label="Stop"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="w-11 h-11 rounded-xl bg-brand-dark text-white flex items-center justify-center hover:bg-brand-dark/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-center font-medium">
            <span className="font-mono">Nudge</span> remembers conversations across phases · Your data is private to you and your org
          </p>
        </div>
      </div>

      <ConversationSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        profile={profile}
        userSkillId={userSkillId}
        skillName={skillName}
        skillIcon={skillIcon}
        turnCount={turns.length}
        onStartNew={handleStartNew}
        starting={startingNew}
      />
    </div>
  )
}

function ChatTurnView({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-end gap-3 flex-row-reverse animate-fade-up">
        <UserAvatar initials="ME" />
        <div className="max-w-[85%] bg-brand-dark text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-md">
          <div className="whitespace-pre-wrap">{turn.content}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-3 animate-fade-up">
      <CoachAvatar />
      <div className="max-w-[85%] bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-card">
        {turn.tools?.map((t) => (
          <ToolUseCard key={t.id} event={t} />
        ))}
        <Markdown>{turn.content}</Markdown>
      </div>
    </div>
  )
}
