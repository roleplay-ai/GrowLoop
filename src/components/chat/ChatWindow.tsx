'use client'
// src/components/chat/ChatWindow.tsx
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

interface Props {
  userSkillId:     string
  conversationId:  string
  initialMessages: Message[]
  skillName:       string
  phase:           'pre' | 'training' | 'post'
}

const PHASE_GREETINGS: Record<string, string> = {
  pre:      "Hi! I'm your AI coach. Let's start by understanding where you are with this skill. Tell me — how would you describe your current level?",
  training: "Welcome back! How have things been going since we last spoke? Any progress or challenges you want to share?",
  post:     "Great news — your Reality Check results are in! Let's review what your peers said and build your action plan.",
}

function BotTyping() {
  return (
    <div className="flex items-end gap-2 animate-fade-up">
      <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-xs flex-shrink-0">🤖</div>
      <div className="bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-card">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-purple/50 animate-typing"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 animate-fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-xs flex-shrink-0">🤖</div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-dark text-white rounded-2xl rounded-br-sm'
            : 'bg-white border border-card-border text-brand-dark rounded-2xl rounded-bl-sm shadow-card'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatWindow({ userSkillId, conversationId, initialMessages, skillName, phase }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  // Show greeting if no messages yet
  const showGreeting = messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, loading])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setLoading(true)

    // Optimistically add user message
    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSkillId,
          conversationId,
          phase,
          skillName,
          message: content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setStreaming(fullText)
      }

      // Save final assistant message
      const assistantMsg: Message = {
        id: `tmp-bot-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: fullText,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreaming('')

      // Persist to Supabase
      await supabase.from('messages').insert([
        { conversation_id: conversationId, role: 'user',      content },
        { conversation_id: conversationId, role: 'assistant', content: fullText },
      ])
    } catch (err) {
      console.error(err)
      setLoading(false)
      setStreaming('')
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 chat-scroll">
        {/* Greeting */}
        {showGreeting && (
          <div className="flex items-end gap-2 animate-fade-up">
            <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-xs flex-shrink-0">🤖</div>
            <div className="max-w-[75%] bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-card">
              {PHASE_GREETINGS[phase]}
            </div>
          </div>
        )}

        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}

        {/* Streaming bot response */}
        {streaming && (
          <div className="flex items-end gap-2 animate-fade-up">
            <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-xs flex-shrink-0">🤖</div>
            <div className="max-w-[75%] bg-white border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-card whitespace-pre-wrap">
              {streaming}
              <span className="inline-block w-0.5 h-4 bg-brand-purple animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}

        {loading && !streaming && <BotTyping />}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies for onboarding */}
      {showGreeting && phase === 'pre' && (
        <div className="px-6 pb-2 flex gap-2 flex-wrap">
          {["I'm a complete beginner", "I have some experience", "I'm fairly advanced"].map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-purple/20 text-brand-purple bg-brand-purple/5 hover:bg-brand-purple/10 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-6 pb-6 pt-3 border-t border-card-border bg-white">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none px-4 py-3 rounded-xl border border-border text-sm text-brand-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all max-h-32"
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-brand-dark text-white flex items-center justify-center text-lg
                       hover:bg-brand-dark/90 active:scale-95 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            ↑
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
          AI-powered coaching · Your data is private
        </p>
      </div>
    </div>
  )
}
