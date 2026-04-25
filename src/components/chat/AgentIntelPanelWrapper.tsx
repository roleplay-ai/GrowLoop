'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import AgentIntelPanel from './AgentIntelPanel'
import MemoryViewer from './MemoryViewer'
import { Folder } from 'lucide-react'

interface Props {
  intel: any
  skillName: string
  conversations: Array<{ id: string; created_at: string; phase: string; preview?: string }>
  activeConversationId?: string
}

export default function AgentIntelPanelWrapper({
  intel,
  skillName,
  conversations,
  activeConversationId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)

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
      <div className="hidden lg:flex flex-col w-80 border-l border-card-border bg-white overflow-hidden">
        <AgentIntelPanel
          intel={intel}
          skillName={skillName}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onPickConversation={handlePick}
          onNewConversation={handleNew}
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
