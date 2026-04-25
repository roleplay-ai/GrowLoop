'use client'
import { useState } from 'react'
import { ChevronDown, FileText, Brain, Search, Terminal, Wrench, Check } from 'lucide-react'

export interface ToolEvent {
  id: string
  name: string
  input?: any
  output?: string
  status: 'running' | 'done' | 'error'
}

const TOOL_META: Record<string, { icon: any; label: string; color: string }> = {
  read:        { icon: FileText, label: 'Reading file',     color: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20' },
  write:       { icon: FileText, label: 'Writing file',     color: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20' },
  edit:        { icon: FileText, label: 'Editing file',     color: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20' },
  memory_read: { icon: Brain,    label: 'Recalling memory', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/25' },
  memory_write:{ icon: Brain,    label: 'Saving memory',    color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/25' },
  web_search:  { icon: Search,   label: 'Searching web',    color: 'text-brand-green bg-brand-green/10 border-brand-green/20' },
  bash:        { icon: Terminal, label: 'Running command',  color: 'text-brand-dark bg-brand-cream border-card-border' },
}

export default function ToolUseCard({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  const meta = TOOL_META[event.name] ?? { icon: Wrench, label: event.name, color: 'text-brand-dark bg-brand-cream border-card-border' }
  const Icon = meta.icon

  return (
    <div className={`my-2 rounded-lg border ${meta.color} overflow-hidden animate-fade-up`}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-black/[0.03] transition-colors"
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">{meta.label}</span>
        {event.status === 'running' && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold opacity-70">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Running
          </span>
        )}
        {event.status === 'done' && (
          <span className="flex items-center gap-1 text-[10px] font-bold opacity-70">
            <Check className="w-3 h-3" />
            Done
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-current/10">
          {event.input && (
            <div className="mb-2">
              <div className="text-[9px] font-black uppercase tracking-wider opacity-60 mb-1">Input</div>
              <pre className="text-[11px] font-mono opacity-80 whitespace-pre-wrap break-words bg-black/[0.04] rounded p-2 max-h-40 overflow-y-auto">
                {typeof event.input === 'string' ? event.input : JSON.stringify(event.input, null, 2)}
              </pre>
            </div>
          )}
          {event.output && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-wider opacity-60 mb-1">Output</div>
              <pre className="text-[11px] font-mono opacity-80 whitespace-pre-wrap break-words bg-black/[0.04] rounded p-2 max-h-40 overflow-y-auto">
                {event.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
