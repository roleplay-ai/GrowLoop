'use client'
import { useEffect, useState } from 'react'
import { FileText, X, Folder, RefreshCw, Lock } from 'lucide-react'

interface MemoryItem {
  id: string
  path: string
  updated_at?: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function MemoryViewer({ open, onClose }: Props) {
  const [items, setItems] = useState<MemoryItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<{ path: string; content: string; updated_at?: string } | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/memory')
      const json = await res.json()
      setItems(json.items ?? [])
      if (json.error) setError(json.error)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load memory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  async function pick(item: MemoryItem) {
    setContentLoading(true)
    setActive({ path: item.path, content: '', updated_at: item.updated_at })
    try {
      const res = await fetch('/api/agents/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: item.id }),
      })
      const json = await res.json()
      setActive({
        path: item.path,
        content: json.content ?? '',
        updated_at: json.updated_at ?? item.updated_at,
      })
    } catch (e: any) {
      setActive({ path: item.path, content: `Error: ${e?.message}`, updated_at: item.updated_at })
    } finally {
      setContentLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-fade-up">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden border border-card-border">
        {/* Sidebar */}
        <div className="w-72 border-r border-card-border bg-brand-cream/40 flex flex-col">
          <div className="px-5 py-4 border-b border-card-border flex items-center gap-2">
            <Folder className="w-4 h-4 text-brand-purple" />
            <h2 className="text-xs font-black uppercase tracking-[2px] text-brand-dark">Your Memory</h2>
            <button
              onClick={load}
              className="ml-auto p-1 rounded hover:bg-white transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {loading && (
              <div className="text-xs text-muted-foreground px-2 py-3">Loading…</div>
            )}
            {error && (
              <div className="text-xs text-brand-red px-2 py-3 leading-snug">{error}</div>
            )}
            {!loading && items && items.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-6 text-center leading-snug">
                Nudge hasn&apos;t saved any memories yet. They&apos;ll appear here as you chat.
              </div>
            )}
            {items?.map((it) => (
              <button
                key={it.id}
                onClick={() => pick(it)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-start gap-2 transition-all ${
                  active?.path === it.path
                    ? 'bg-brand-purple text-white shadow-md'
                    : 'hover:bg-white text-brand-dark'
                }`}
              >
                <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
                <span className="font-mono break-all leading-tight">{it.path}</span>
              </button>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-card-border bg-white flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-muted-foreground/60" />
            <p className="text-[10px] text-muted-foreground leading-tight">Private to you</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">
                Memory file
              </p>
              <p className="font-mono text-sm text-brand-dark mt-0.5">
                {active?.path ?? 'Select a memory to view'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-brand-cream transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!active ? (
              <div className="h-full flex items-center justify-center text-center">
                <div className="max-w-sm">
                  <div className="w-14 h-14 rounded-full bg-brand-cream mx-auto mb-3 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-sm font-bold text-brand-dark mb-1">
                    Read what your coach remembers
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each file is a small note Nudge has written to remember context across sessions.
                    Pick one to read it.
                  </p>
                </div>
              </div>
            ) : contentLoading ? (
              <div className="text-sm text-muted-foreground">Loading content…</div>
            ) : (
              <pre className="font-mono text-xs text-brand-dark whitespace-pre-wrap break-words leading-relaxed">
                {active.content}
              </pre>
            )}
          </div>

          {active?.updated_at && (
            <div className="px-6 py-2 border-t border-card-border text-[10px] text-muted-foreground/60 font-mono">
              Last updated {new Date(active.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
