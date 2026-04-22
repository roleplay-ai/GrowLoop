'use client'

import { useState, useEffect } from 'react'
import { createOrg } from '@/app/(super-admin)/orgs/actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateOrgModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [plan, setPlan] = useState<'starter' | 'growth' | 'enterprise'>('starter')
  const [seatLimit, setSeatLimit] = useState(50)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugEdited, setSlugEdited] = useState(false)

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 30)
      setSlug(generated)
    }
  }, [name, slugEdited])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('slug', slug)
    formData.set('plan', plan)
    formData.set('seat_limit', seatLimit.toString())

    const result = await createOrg(formData)

    if (result.success) {
      setName('')
      setSlug('')
      setPlan('starter')
      setSeatLimit(50)
      setSlugEdited(false)
      onSuccess?.()
      onClose()
    } else {
      setError(result.error ?? 'Failed to create organization')
    }

    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
        <h2 className="text-lg font-black text-white mb-1">Create Organization</h2>
        <p className="text-xs text-white/50 mb-6">Set up a new organization on the platform</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/50"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
              URL Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">nudgeable.ai/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  setSlugEdited(true)
                }}
                placeholder="acme-corp"
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/50"
                required
              />
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
              Plan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['starter', 'growth', 'enterprise'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    plan === p
                      ? 'bg-brand-yellow text-brand-dark'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Seat Limit */}
          <div>
            <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
              Seat Limit
            </label>
            <input
              type="number"
              value={seatLimit}
              onChange={(e) => setSeatLimit(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={10000}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/50"
              required
            />
            <p className="text-[10px] text-white/40 mt-1">Maximum number of users this org can have</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
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
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
