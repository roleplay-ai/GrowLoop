'use client'
// src/components/hr/ParticipantsTable.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'
import AddParticipantModal from './AddParticipantModal'
import CSVImportModal from './CSVImportModal'
import EditParticipantModal from './EditParticipantModal'
import {
  deactivateParticipant,
  reactivateParticipant,
  resetParticipantPassword,
} from '@/app/(hr)/participants/actions'

interface Group {
  id: string
  name: string
}

interface Props {
  participants: (User & { user_skills?: { count: number }[]; group_members?: { group_id: string }[] })[]
  groups?: Group[]
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-brand-green/10 text-brand-green',
  invited:   'bg-brand-orange/10 text-brand-orange',
  inactive:  'bg-muted/20 text-muted-foreground',
  suspended: 'bg-red-500/10 text-red-500',
}

export default function ParticipantsTable({ participants, groups = [] }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwConfirm, setResetPwConfirm] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  const filtered = participants.filter(p => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleToggleStatus = async (p: User) => {
    setActionLoading(p.id)
    if (p.status === 'active') {
      await deactivateParticipant(p.id)
    } else {
      await reactivateParticipant(p.id)
    }
    router.refresh()
    setActionLoading(null)
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUser) return

    setIsResetting(true)
    setResetError(null)

    if (resetPwValue !== resetPwConfirm) {
      setResetError('Passwords do not match')
      setIsResetting(false)
      return
    }

    const result = await resetParticipantPassword(resetUser.id, resetPwValue)
    if (result.success && result.credentials) {
      setCredentials(result.credentials)
      setResetUser(null)
      setResetPwValue('')
      setResetPwConfirm('')
    } else {
      setResetError(result.error ?? 'Failed to reset password')
    }
    setIsResetting(false)
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-brand-dark bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="invited">Invited</option>
        </select>
        <button
          onClick={() => setIsImportOpen(true)}
          className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:border-brand-dark hover:text-brand-dark transition-all bg-white"
        >
          📤 Import CSV
        </button>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 transition-colors"
        >
          + Add Participant
        </button>
      </div>

      {/* Count */}
      <div className="text-xs text-muted-foreground font-semibold mb-3">
        {filtered.length} participant{filtered.length !== 1 ? 's' : ''}
        {statusFilter !== 'all' && ` (${statusFilter})`}
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
                  {search || statusFilter !== 'all' ? 'No matching participants.' : 'No participants yet. Add your first one!'}
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
                      <button
                        onClick={() => setEditUser(p)}
                        disabled={actionLoading === p.id}
                        className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5 transition-colors disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setResetUser(p)}
                        disabled={actionLoading === p.id}
                        className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5 transition-colors disabled:opacity-50"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => handleToggleStatus(p)}
                        disabled={actionLoading === p.id}
                        className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded hover:bg-brand-cream transition-colors disabled:opacity-50"
                      >
                        {actionLoading === p.id ? '...' : p.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddParticipantModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => router.refresh()}
        groups={groups}
      />

      <CSVImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {editUser && (
        <EditParticipantModal
          user={editUser}
          groups={groups}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null)
            router.refresh()
          }}
        />
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setResetUser(null)
            setResetPwValue('')
            setResetPwConfirm('')
            setResetError(null)
          }} />
          <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <h2 className="text-lg font-black text-white mb-1">Reset Password</h2>
            <p className="text-xs text-white/50 mb-6">
              Set a new password for <span className="text-brand-yellow">{resetUser.name}</span>
            </p>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">New Password</label>
                <input
                  type="text"
                  value={resetPwValue}
                  onChange={(e) => setResetPwValue(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <input
                  type="text"
                  value={resetPwConfirm}
                  onChange={(e) => setResetPwConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              {resetError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {resetError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetUser(null)
                    setResetPwValue('')
                    setResetPwConfirm('')
                    setResetError(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
                  disabled={isResetting}
                >
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials display */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCredentials(null)} />
          <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔐</div>
              <h2 className="text-lg font-black text-white">Password Updated</h2>
              <p className="text-xs text-white/50 mt-1">Share with the participant - they'll change on next login</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-[10px] text-white/50 uppercase tracking-wide">Email</div>
                <div className="text-sm text-white font-mono">{credentials.email}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-[10px] text-white/50 uppercase tracking-wide">New Password</div>
                <div className="text-sm text-white font-mono">{credentials.password}</div>
              </div>
            </div>

            <button
              onClick={() => {
                copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
                setCredentials(null)
              }}
              className="w-full px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
