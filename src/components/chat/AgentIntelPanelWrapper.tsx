'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import AgentIntelPanel from './AgentIntelPanel'
import MemoryViewer from './MemoryViewer'
import { Folder } from 'lucide-react'

interface IntelShape {
  current_level?: string | null
  context?: string | null
  motivations?: string[] | null
  blockers?: string[] | null
  raw_summary?: string | null
  updated_at?: string
}

interface Props {
  intel: IntelShape | null
  skillName: string
  conversations: Array<{ id: string; created_at: string; phase: string; preview?: string }>
  activeConversationId?: string
}

type IntelKey = 'current_level' | 'context' | 'motivations' | 'blockers' | 'raw_summary'

/** Diff two intels and return the keys that changed (for capture animation). */
function diffIntel(prev: IntelShape | null, next: IntelShape | null): IntelKey[] {
  if (!next) return []
  const changed: IntelKey[] = []
  const text = (v: string | null | undefined) => (v ?? '').trim()
  const arr = (v: string[] | null | undefined) => (v ?? []).join('|')
  if (text(prev?.current_level) !== text(next.current_level)) changed.push('current_level')
  if (text(prev?.context) !== text(next.context)) changed.push('context')
  if (arr(prev?.motivations) !== arr(next.motivations)) changed.push('motivations')
  if (arr(prev?.blockers) !== arr(next.blockers)) changed.push('blockers')
  if (text(prev?.raw_summary) !== text(next.raw_summary)) changed.push('raw_summary')
  return changed
}

export default function AgentIntelPanelWrapper({
  intel: initialIntel,
  skillName,
  conversations,
  activeConversationId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)

  const [intel, setIntel] = useState<IntelShape | null>(initialIntel ?? null)
  const [capturing, setCapturing] = useState(false)
  const [recentlyCaptured, setRecentlyCaptured] = useState<IntelKey[]>([])
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // If the server-rendered initialIntel changes (e.g. after navigating to
  // a different conversation), pull it in.
  useEffect(() => {
    setIntel(initialIntel ?? null)
  }, [initialIntel])

  useEffect(() => {
    function onCapturing() {
      setCapturing(true)
    }
    function onCaptureFailed() {
      setCapturing(false)
    }
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<IntelShape>).detail
      if (!detail) return
      setIntel((prev) => {
        const changed = diffIntel(prev, detail)
        if (changed.length) {
          setRecentlyCaptured(changed)
          if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
          animTimeoutRef.current = setTimeout(() => setRecentlyCaptured([]), 2200)
        }
        return detail
      })
      setCapturing(false)
    }
    window.addEventListener('agent-intel:capturing', onCapturing)
    window.addEventListener('agent-intel:capture-failed', onCaptureFailed)
    window.addEventListener('agent-intel:update', onUpdate as EventListener)
    return () => {
      window.removeEventListener('agent-intel:capturing', onCapturing)
      window.removeEventListener('agent-intel:capture-failed', onCaptureFailed)
      window.removeEventListener('agent-intel:update', onUpdate as EventListener)
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    }
  }, [])

  const handlePick = (id: string) => {
    startTransition(() => {
      router.push(`${pathname}?c=${id}`)
    })
  }

  const handleNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/conversations/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const { id } = await res.json()
      router.push(`${pathname}?c=${id}`)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="hidden lg:flex flex-col w-[360px] flex-shrink-0 border-r border-card-border bg-white overflow-hidden">
        <AgentIntelPanel
          intel={intel}
          skillName={skillName}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onPickConversation={handlePick}
          onNewConversation={handleNew}
          capturing={capturing}
          recentlyCaptured={recentlyCaptured}
        />
        <button
          onClick={() => setMemoryOpen(true)}
          className="border-t border-card-border px-5 py-3 flex items-center gap-2 text-xs font-bold text-brand-purple hover:bg-brand-purple/5 transition-colors"
        >
          <Folder className="w-3.5 h-3.5" />
          View raw memory files
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">→</span>
        </button>
      </div>
      <MemoryViewer open={memoryOpen} onClose={() => setMemoryOpen(false)} />
    </>
  )
}
