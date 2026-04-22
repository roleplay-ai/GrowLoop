'use client'

import { useState } from 'react'
import type { User } from '@/lib/types'
import { updateParticipant } from '@/app/(hr)/participants/actions'

interface Group {
  id: string
  name: string
}

interface Props {
  user: User & { group_members?: { group_id: string }[] }
  groups: Group[]
  onClose: () => void
  onSuccess: () => void
}

export default function EditParticipantModal({ user, groups, onClose, onSuccess }: Props) {
  const [name, setName] = useState(user.name ?? '')
  const [title, setTitle] = useState(user.title ?? '')
  const [func, setFunc] = useState(user.func ?? '')
  const [groupId, setGroupId] = useState(user.group_members?.[0]?.group_id ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('title', title)
    formData.set('func', func)
    formData.set('group_id', groupId)

    const result = await updateParticipant(user.id, formData)

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error ?? 'Failed to update participant')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
        <h2 className="text-lg font-black text-white mb-1">Edit Participant</h2>
        <p className="text-xs text-white/50 mb-6">
          Update details for <span className="text-brand-yellow">{user.email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-yellow"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Engineer"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Function</label>
              <input
                type="text"
                value={func}
                onChange={(e) => setFunc(e.target.value)}
                placeholder="Engineering"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          {groups.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Group</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-yellow"
              >
                <option value="">No group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id} className="bg-brand-dark">{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
