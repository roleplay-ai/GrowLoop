'use client'
// src/components/skills/SkillsGrid.tsx
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserSkill, Skill } from '@/lib/types'

interface Props {
  userSkills:      UserSkill[]
  availableSkills: Skill[]
}

const PHASE_CONFIG = {
  pre:      { label: 'Pre-Training',  color: '#F68A29', bg: 'rgba(246,138,41,0.1)'  },
  training: { label: 'In Training',   color: '#623CEA', bg: 'rgba(98,60,234,0.1)'   },
  post:     { label: 'Post-Training', color: '#23CE68', bg: 'rgba(35,206,104,0.1)'  },
}

function SkillCard({ us }: { us: UserSkill }) {
  const phase  = PHASE_CONFIG[us.phase]
  const growth = us.peer_growth ?? 0

  return (
    <Link
      href={`/app/skills/${us.id}/chat`}
      className="nudge-card rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{(us.skill as any)?.icon ?? '🧠'}</span>
          <div>
            <div className="text-sm font-bold text-brand-dark group-hover:text-brand-purple transition-colors">
              {(us.skill as any)?.name}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Round {us.rc_round} · {us.surveys_filled}/{us.surveys_sent} responses
            </div>
          </div>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-0.5"
          style={{ color: phase.color, background: phase.bg }}
        >
          {phase.label}
        </span>
      </div>

      {/* Scores */}
      {us.current_peer != null && (
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-brand-cream rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-black text-brand-dark">{us.current_peer?.toFixed(1)}</div>
            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Peer avg</div>
          </div>
          {us.self_avg != null && (
            <div className="flex-1 bg-brand-cream rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-black text-brand-dark">{us.self_avg?.toFixed(1)}</div>
              <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Self</div>
            </div>
          )}
          {growth !== 0 && (
            <div className="flex-1 bg-brand-cream rounded-lg px-3 py-2 text-center">
              <div className={`text-lg font-black ${growth > 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                {growth > 0 ? '+' : ''}{growth.toFixed(1)}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Growth</div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-brand-cream rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full xp-gradient transition-all duration-700"
          style={{ width: `${us.phase === 'pre' ? 20 : us.phase === 'training' ? 55 : 90}%` }}
        />
      </div>

      {/* CTA */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-purple">
          {us.phase === 'pre' ? 'Start onboarding →' : us.phase === 'training' ? 'Continue chat →' : 'View results →'}
        </span>
        <span className="text-xs text-muted-foreground">
          {us.phase === 'training' ? '🎯 Reality Check pending' : ''}
        </span>
      </div>
    </Link>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">🧠</div>
      <h3 className="text-lg font-bold text-brand-dark mb-2">No skills yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Pick a skill to start your growth journey with AI coaching.
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 bg-brand-dark text-white rounded-lg text-sm font-black hover:bg-brand-dark/90 transition-colors"
      >
        + Add a skill
      </button>
    </div>
  )
}

export default function SkillsGrid({ userSkills, availableSkills }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [enrolling, setEnrolling]   = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  async function enroll(skillId: string) {
    setEnrolling(skillId)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('users').select('org_id').eq('id', user!.id).single()

    await supabase.from('user_skills').insert({
      user_id:  user!.id,
      skill_id: skillId,
      org_id:   profile?.org_id,
      phase:    'pre',
    })

    setEnrolling(null)
    setShowPicker(false)
    router.refresh()
  }

  if (userSkills.length === 0 && !showPicker) {
    return <EmptyState onAdd={() => setShowPicker(true)} />
  }

  return (
    <div>
      {/* Active skills grid */}
      {userSkills.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-brand-dark">Active Skills</h2>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs font-bold text-brand-purple hover:underline"
            >
              + Add skill
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {userSkills.map(us => <SkillCard key={us.id} us={us} />)}
          </div>
        </>
      )}

      {/* Skill picker */}
      {showPicker && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-brand-dark">Add a Skill</h2>
            {userSkills.length > 0 && (
              <button onClick={() => setShowPicker(false)} className="text-xs text-muted-foreground hover:text-brand-dark">
                Cancel
              </button>
            )}
          </div>

          {availableSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No more skills available to add.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {availableSkills.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => enroll(skill.id)}
                  disabled={enrolling === skill.id}
                  className="nudge-card rounded-xl p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">{skill.icon ?? '🧠'}</span>
                    <span className="font-bold text-sm text-brand-dark">{skill.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                  <div className="mt-3 text-xs font-bold text-brand-purple">
                    {enrolling === skill.id ? 'Adding…' : 'Start learning →'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
