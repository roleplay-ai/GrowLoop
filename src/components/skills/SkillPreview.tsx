'use client'
// src/components/skills/SkillPreview.tsx
// Skill preview with dimensions accordion and enrollment CTA

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { enrollInSkill } from '@/app/(app)/skills/actions'
import type { Skill, SkillDimension } from '@/lib/types'

interface Props {
  skill: Skill
  isEnrolled: boolean
  existingUserSkillId?: string
}

function DimensionAccordion({ dimension, index }: { dimension: SkillDimension; index: number }) {
  const [isOpen, setIsOpen] = useState(index === 0)

  return (
    <div className="border border-card-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-brand-cream/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="font-semibold text-sm text-brand-dark">{dimension.name}</span>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 py-3 bg-brand-cream/30 border-t border-card-border">
          <p className="text-sm text-muted-foreground mb-3">{dimension.description}</p>

          {dimension.rubric && Object.keys(dimension.rubric).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-brand-dark uppercase tracking-wide">Rating Levels</p>
              <div className="space-y-1.5">
                {Object.entries(dimension.rubric).map(([level, desc]) => (
                  <div key={level} className="flex gap-2 text-xs">
                    <span className="w-5 h-5 rounded bg-brand-purple/10 text-brand-purple font-bold flex items-center justify-center flex-shrink-0">
                      {level}
                    </span>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SkillPreview({ skill, isEnrolled, existingUserSkillId }: Props) {
  const router = useRouter()
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dimensions = (skill.dimensions as SkillDimension[]) ?? []

  async function handleEnroll() {
    setEnrolling(true)
    setError(null)

    const result = await enrollInSkill(skill.id)

    if (result.success && result.userSkillId) {
      router.push(`/skills/${result.userSkillId}/chat`)
    } else {
      setError(result.error ?? 'Failed to enroll')
      setEnrolling(false)
    }
  }

  function handleContinue() {
    if (existingUserSkillId) {
      router.push(`/skills/${existingUserSkillId}/chat`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-6xl mb-4 block">{skill.icon ?? '🧠'}</span>
        <h1 className="text-2xl font-black text-brand-dark mb-2">{skill.name}</h1>
        <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-brand-purple bg-brand-purple/10 px-2.5 py-1 rounded-full">
          {skill.source === 'platform' ? 'Platform Skill' : 'Custom Skill'}
        </span>
      </div>

      {/* Why this matters */}
      <div className="nudge-card rounded-xl p-6 mb-6">
        <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide mb-3">
          Why this matters
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {skill.description || 'Master this skill to unlock new opportunities and grow professionally.'}
        </p>
      </div>

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide mb-4">
            Dimensions ({dimensions.length})
          </h2>
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <DimensionAccordion key={dim.id} dimension={dim} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* What you'll learn */}
      <div className="nudge-card rounded-xl p-6 mb-8">
        <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide mb-3">
          What you'll do
        </h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-brand-green mt-0.5">✓</span>
            Chat with your AI coach to assess your current level
          </li>
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-brand-green mt-0.5">✓</span>
            Get feedback from peers through a Reality Check survey
          </li>
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-brand-green mt-0.5">✓</span>
            Receive a personalized action plan for improvement
          </li>
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-brand-green mt-0.5">✓</span>
            Track your progress and measure growth over time
          </li>
        </ul>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* CTA */}
      <div className="text-center">
        {isEnrolled ? (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-sm text-brand-green font-semibold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Already enrolled
            </div>
            <div>
              <button
                onClick={handleContinue}
                className="px-8 py-3 bg-brand-purple text-white rounded-lg text-sm font-black
                           hover:bg-brand-purple/90 active:scale-[0.98] transition-all"
              >
                Continue learning →
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="px-8 py-3 bg-brand-dark text-white rounded-lg text-sm font-black
                       hover:bg-brand-dark/90 active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrolling ? 'Starting…' : 'Start this skill →'}
          </button>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        Starting takes about 5 minutes. You can pause anytime.
      </p>
    </div>
  )
}
