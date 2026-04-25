'use client'
// src/components/chat/AgentIntelPanelWrapper.tsx
//
// Bridge between server-rendered initial state and the live, structured
// AgentIntelPanel. Listens for `agent-intel:update` events (fired both by
// the chat slot-flow and the panel's inline edits) and keeps a local copy
// of the profile JSONB in sync.

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import AgentIntelPanel from './AgentIntelPanel'
import MemoryViewer from './MemoryViewer'
import { Folder } from 'lucide-react'
import type { IntelProfile, SlotKey } from '@/lib/agent/slots'
import { SLOT_KEYS } from '@/lib/agent/slots'

interface Props {
  userSkillId: string
  initialProfile: IntelProfile | null
  skillName: string
  conversations: Array<{ id: string; created_at: string; phase: string; preview?: string }>
  activeConversationId?: string
}

/** Diff two profiles; return slot keys whose value changed. */
function diffProfile(prev: IntelProfile | null, next: IntelProfile | null): SlotKey[] {
  if (!next) return []
  const changed: SlotKey[] = []
  for (const k of SLOT_KEYS) {
    const a = (prev?.[k] ?? '').trim()
    const b = (next[k] ?? '').trim()
    if (a !== b) changed.push(k)
  }
  return changed
}

export default function AgentIntelPanelWrapper({
  userSkillId,
  initialProfile,
  skillName,
  conversations,
  activeConversationId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)

  const [profile, setProfile] = useState<IntelProfile | null>(initialProfile ?? {})
  const [recentlyCaptured, setRecentlyCaptured] = useState<SlotKey[]>([])
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setProfile(initialProfile ?? {})
  }, [initialProfile])

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<IntelProfile>).detail
      if (!detail) return
      setProfile((prev) => {
        const changed = diffProfile(prev, detail)
        if (changed.length) {
          setRecentlyCaptured(changed)
          if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
          animTimeoutRef.current = setTimeout(() => setRecentlyCaptured([]), 2200)
        }
        return detail
      })
    }
    window.addEventListener('agent-intel:update', onUpdate as EventListener)
    return () => {
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
          userSkillId={userSkillId}
          profile={profile}
          skillName={skillName}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onPickConversation={handlePick}
          onNewConversation={handleNew}
          recentlyCaptured={recentlyCaptured}
          onSlotSaved={(p) => setProfile(p)}
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
