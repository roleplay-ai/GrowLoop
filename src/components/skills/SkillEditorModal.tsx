'use client'
// src/components/skills/SkillEditorModal.tsx
//
// Reusable skill editor used by Super Admin (platform skills) and HR (org clones).
// The action prop is the server action to invoke on save — its signature must be
//   (formData: FormData) => Promise<{ success: boolean; error?: string }>

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, AlertCircle, Sparkles } from 'lucide-react'

interface Dimension {
  id: string
  name: string
  description?: string
  rubric?: { '1': string; '2': string; '3': string; '4': string; '5': string }
}

interface Skill {
  id?: string
  name: string
  icon?: string | null
  description?: string | null
  dimensions?: Dimension[] | null
}

interface Props {
  open: boolean
  onClose: () => void
  skill?: Skill | null
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  title?: string
  subtitle?: string
  submitLabel?: string
}

const EMOJI_OPTIONS = [
  '🧠', '💬', '🎯', '🚀', '⚡', '🔥', '✨', '💡',
  '🎨', '📊', '📈', '🤝', '🛠️', '⚙️', '🔍', '👥',
  '📝', '📚', '🏆', '⭐', '💪', '🌱', '🌟', '🧭',
]

function newDimension(): Dimension {
  return {
    id:
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    name: '',
  }
}

export default function SkillEditorModal({
  open,
  onClose,
  skill,
  onSubmit,
  title,
  subtitle,
  submitLabel = 'Save skill',
}: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧠')
  const [description, setDescription] = useState('')
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setName(skill?.name ?? '')
    setIcon(skill?.icon ?? '🧠')
    setDescription(skill?.description ?? '')
    const initial = (skill?.dimensions ?? []).map((d) => ({
      id: d.id,
      name: d.name ?? '',
    }))
    setDimensions(initial)
    setError(null)
    setShowEmojiPicker(false)
  }, [open, skill])

  // Click-outside for emoji picker
  useEffect(() => {
    if (!showEmojiPicker) return
    const onDoc = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showEmojiPicker])

  if (!open) return null

  function addDimension() {
    const dim = newDimension()
    setDimensions((d) => [...d, dim])
    setError(null)
  }

  function removeDimension(id: string) {
    setDimensions((d) => d.filter((x) => x.id !== id))
  }

  function updateDim(id: string, patch: Partial<Dimension>) {
    setDimensions((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  const MAX_DIMENSIONS = 10

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || name.trim().length < 2) {
      setError('Skill name must be at least 2 characters')
      return
    }
    if (dimensions.length > MAX_DIMENSIONS) {
      setError(`Maximum ${MAX_DIMENSIONS} dimensions allowed`)
      return
    }
    const incompleteDim = dimensions.find((d) => !d.name.trim())
    if (incompleteDim) {
      setError('All dimensions need a name')
      return
    }
    const longDim = dimensions.find((d) => d.name.trim().length > 1000)
    if (longDim) {
      setError('Dimension name cannot exceed 1000 characters')
      return
    }

    setSubmitting(true)
    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('icon', icon)
    fd.set('description', description.trim())
    fd.set('dimensions', JSON.stringify(dimensions))

    const res = await onSubmit(fd)
    setSubmitting(false)
    if (!res.success) {
      setError(res.error ?? 'Failed to save')
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-fade-up">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-card-border">
        {/* Header */}
        <div className="px-6 py-5 border-b border-card-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-brand-purple" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-brand-dark truncate">
                {title ?? (skill?.id ? 'Edit skill' : 'Create new skill')}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {subtitle ?? 'Define the skill and add as many dimensions as you need (each rated 1–5).'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-brand-cream transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-brand-red/5 border border-brand-red/25 text-brand-red text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium leading-tight">{error}</span>
              </div>
            )}

            {/* Name + icon */}
            <div className="flex gap-3">
              <div className="relative" ref={emojiRef}>
                <label className="block text-[10px] font-black text-brand-dark mb-1.5 uppercase tracking-[1.5px]">
                  Icon
                </label>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((s) => !s)}
                  className="w-14 h-[46px] rounded-lg border border-border bg-white text-2xl flex items-center justify-center hover:border-brand-purple/40 transition-colors"
                >
                  {icon}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 z-10 bg-white border border-card-border rounded-xl shadow-lg p-2 grid grid-cols-8 gap-1 w-72">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setIcon(e)
                          setShowEmojiPicker(false)
                        }}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-lg hover:bg-brand-cream transition-colors ${icon === e ? 'bg-brand-purple/10' : ''
                          }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-brand-dark mb-1.5 uppercase tracking-[1.5px]">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Effective Listening"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
                  maxLength={60}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black text-brand-dark mb-1.5 uppercase tracking-[1.5px]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this skill, in one or two sentences?"
                rows={2}
                maxLength={1000}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all resize-none"
              />
              <div className="text-right text-[10px] text-muted-foreground/50 font-mono mt-1">
                {description.length} / 1000
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h3 className="text-[10px] font-black text-brand-dark uppercase tracking-[1.5px]">
                    Dimensions
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sub-aspects peers will rate 1–5. Add as many as you need.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDimension}
                  disabled={dimensions.length >= MAX_DIMENSIONS}
                  className="text-xs font-bold text-brand-purple hover:bg-brand-purple/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add dimension
                </button>
              </div>

              {dimensions.length === 0 ? (
                <div className="border-2 border-dashed border-card-border rounded-xl px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No dimensions yet — add at least one so peers have something concrete to rate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dimensions.map((dim, idx) => (
                    <DimensionCard
                      key={dim.id}
                      dim={dim}
                      index={idx}
                      onRemove={() => removeDimension(dim.id)}
                      onUpdate={(patch) => updateDim(dim.id, patch)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-card-border flex items-center justify-between bg-brand-cream/30 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground/70 font-mono">
              {dimensions.length} / {MAX_DIMENSIONS} dimension{dimensions.length === 1 ? '' : 's'} · each rated 1–5
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-brand-dark hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
              >
                {submitting && (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? 'Saving…' : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Dimension card ──────────────────────────────────────────────────────────
function DimensionCard({
  dim,
  index,
  onRemove,
  onUpdate,
}: {
  dim: Dimension
  index: number
  onRemove: () => void
  onUpdate: (p: Partial<Dimension>) => void
}) {
  return (
    <div className="border border-card-border rounded-xl bg-white px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-brand-purple/10 text-brand-purple text-[10px] font-black flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <span className="flex items-center gap-0.5 ml-auto flex-shrink-0">
          {(['1', '2', '3', '4', '5'] as const).map((lvl) => (
            <span
              key={lvl}
              className="w-5 h-5 rounded bg-brand-yellow/15 text-brand-dark text-[9px] font-black flex items-center justify-center"
            >
              {lvl}
            </span>
          ))}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 rounded-md hover:bg-brand-red/10 hover:text-brand-red flex items-center justify-center text-muted-foreground transition-colors flex-shrink-0"
          aria-label="Remove dimension"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <textarea
        value={dim.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Dimension name or description (e.g. Active listening — the ability to…)"
        maxLength={1000}
        rows={2}
        className="w-full px-2 py-1.5 text-sm font-bold text-brand-dark bg-transparent placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-brand-purple/30 rounded-md resize-none"
      />
      <div className="text-right text-[10px] text-muted-foreground/40 font-mono">
        {dim.name.length} / 1000
      </div>
    </div>
  )
}
