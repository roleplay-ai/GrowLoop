// src/app/(app)/skills/[userSkillId]/plan/page.tsx
// Action plan page - placeholder for Phase 9

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ userSkillId: string }>
}

export const metadata: Metadata = { title: 'Action Plan' }

export default async function PlanPage({ params }: Props) {
  const { userSkillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('*, skill:skills(name)')
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  // Only show plan for training/post phases
  if (userSkill.phase === 'pre') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">📋</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">Action Plan Not Available Yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Complete your onboarding chat and Reality Check to receive your personalized action plan.
        </p>
      </div>
    )
  }

  // Fetch actions for this skill
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('user_skill_id', userSkillId)
    .order('position', { ascending: true })

  if (!actions || actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">📋</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">Generating Your Plan...</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your personalized action plan will appear here after your Reality Check results are processed.
        </p>
      </div>
    )
  }

  const completed = actions.filter(a => a.status === 'done').length
  const total = actions.length

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Progress header */}
        <div className="nudge-card rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brand-dark">Your Action Plan</h2>
            <span className="text-sm font-semibold text-brand-purple">
              {completed}/{total} complete
            </span>
          </div>
          <div className="bg-brand-cream rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions list */}
        <div className="space-y-3">
          {actions.map((action, i) => (
            <div
              key={action.id}
              className={`nudge-card rounded-xl p-5 ${action.status === 'done' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  action.status === 'done' 
                    ? 'bg-brand-green text-white' 
                    : 'bg-brand-cream text-brand-dark'
                }`}>
                  {action.status === 'done' ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-sm ${action.status === 'done' ? 'line-through text-muted-foreground' : 'text-brand-dark'}`}>
                    {action.title}
                  </h3>
                  {action.what && (
                    <p className="text-xs text-muted-foreground mt-1">{action.what}</p>
                  )}
                  {action.difficulty && (
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < action.difficulty! ? 'bg-brand-purple' : 'bg-brand-cream'
                          }`}
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">difficulty</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Full action plan management coming in Phase 9
        </p>
      </div>
    </div>
  )
}
