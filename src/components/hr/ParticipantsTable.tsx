'use client'
// src/components/hr/ParticipantsTable.tsx
import { useState } from 'react'
import type { User } from '@/lib/types'

interface Props {
  participants: (User & { user_skills?: { count: number }[] })[]
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-brand-green/10 text-brand-green',
  invited:   'bg-brand-orange/10 text-brand-orange',
  inactive:  'bg-muted/20 text-muted-foreground',
  suspended: 'bg-brand-red/10 text-brand-red',
}

export default function ParticipantsTable({ participants }: Props) {
  const [search, setSearch] = useState('')

  const filtered = participants.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Search + filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participants…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all bg-white"
          />
        </div>
        <button className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:border-brand-dark hover:text-brand-dark transition-all bg-white">
          Filter
        </button>
        <button className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:border-brand-dark hover:text-brand-dark transition-all bg-white">
          Import CSV
        </button>
      </div>

      {/* Count */}
      <div className="text-xs text-muted-foreground font-semibold mb-3">
        {filtered.length} participant{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="nudge-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              {['Participant', 'Email', 'Status', 'Skills', 'Last active', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                  {search ? 'No matching participants.' : 'No participants yet. Add your first one!'}
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="border-b border-card-border/50 hover:bg-brand-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                        style={{ background: p.avatar_color ?? '#623CEA' }}
                      >
                        {p.avatar_emoji ?? p.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-brand-dark">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.title ?? p.func ?? 'Participant'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 ${STATUS_STYLES[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-brand-dark">
                    {(p.user_skills as any)?.[0]?.count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.last_active_at
                      ? new Date(p.last_active_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5 transition-colors">
                        Edit
                      </button>
                      <button className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded hover:bg-brand-cream transition-colors">
                        Resend
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
