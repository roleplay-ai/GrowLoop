'use client'

import { useState } from 'react'
import { createParticipant } from '@/app/(hr)/participants/actions'

interface Group {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  groups?: Group[]
}

export default function AddParticipantModal({ isOpen, onClose, onSuccess, groups = [] }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [title, setTitle] = useState('')
  const [func, setFunc] = useState('')
  const [groupId, setGroupId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.set('name', name)
    formData.set('email', email)
    formData.set('password', password)
    if (title) formData.set('title', title)
    if (func) formData.set('func', func)
    if (groupId) formData.set('group_id', groupId)

    const result = await createParticipant(formData)

    if (result.success && result.credentials) {
      setCredentials(result.credentials)
      onSuccess?.()
    } else {
      setError(result.error ?? 'Failed to create participant')
    }

    setIsSubmitting(false)
  }

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setTitle('')
    setFunc('')
    setGroupId('')
    setError(null)
    setCredentials(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  if (!isOpen) return null

  if (credentials) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-lg font-black text-white">Participant Created</h2>
            <p className="text-xs text-white/50 mt-1">Share these credentials. They'll change password on first login.</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wide">Email</div>
                  <div className="text-sm text-white font-mono">{credentials.email}</div>
                </div>
                <button onClick={() => copyToClipboard(credentials.email)} className="text-xs text-brand-yellow hover:underline">Copy</button>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wide">Password</div>
                  <div className="text-sm text-white font-mono">{credentials.password}</div>
                </div>
                <button onClick={() => copyToClipboard(credentials.password)} className="text-xs text-brand-yellow hover:underline">Copy</button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                reset()
              }}
              className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={() => {
                copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
                handleClose()
              }}
              className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors"
            >
              Copy & Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-black text-white mb-1">Add Participant</h2>
        <p className="text-xs text-white/50 mb-6">Create a new participant in your organization</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Password *</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Confirm Password *</label>
            <input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
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
              onClick={handleClose}
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
              {isSubmitting ? 'Creating...' : 'Create Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
