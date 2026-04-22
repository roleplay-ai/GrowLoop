// src/app/(app)/skills/[userSkillId]/intel/page.tsx
// Agent Intel viewer - placeholder for Phase 7

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ userSkillId: string }>
}

export const metadata: Metadata = { title: 'AI Intel' }

export default async function IntelPage({ params }: Props) {
  const { userSkillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('*, skill:skills(id, name)')
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  const skill = userSkill.skill as { id: string; name: string }

  // Fetch agent intel
  const { data: intel } = await supabase
    .from('agent_intel')
    .select('*')
    .eq('user_id', user!.id)
    .eq('skill_id', skill.id)
    .single()

  if (!intel) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">🧠</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">No Intel Yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Continue chatting with your AI coach. After a few messages, the AI will build a profile of your current skill level and context.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-brand-dark mb-1">What the AI Knows About You</h2>
          <p className="text-sm text-muted-foreground">
            This is what your AI coach has learned from your conversations about {skill.name}.
          </p>
        </div>

        {/* Intel cards */}
        <div className="grid gap-4">
          {/* Current Level */}
          <div className="nudge-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📍</span>
              <h3 className="font-bold text-sm text-brand-dark">Current Level</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {intel.current_level || 'Not assessed yet'}
            </p>
          </div>

          {/* Context */}
          <div className="nudge-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏢</span>
              <h3 className="font-bold text-sm text-brand-dark">Your Context</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {intel.context || 'No context captured yet'}
            </p>
          </div>

          {/* Motivations */}
          <div className="nudge-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <h3 className="font-bold text-sm text-brand-dark">Motivations</h3>
            </div>
            {intel.motivations && intel.motivations.length > 0 ? (
              <ul className="space-y-1">
                {intel.motivations.map((m: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-brand-green">•</span>
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No motivations identified yet</p>
            )}
          </div>

          {/* Blockers */}
          <div className="nudge-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚧</span>
              <h3 className="font-bold text-sm text-brand-dark">Blockers</h3>
            </div>
            {intel.blockers && intel.blockers.length > 0 ? (
              <ul className="space-y-1">
                {intel.blockers.map((b: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-brand-orange">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No blockers identified yet</p>
            )}
          </div>
        </div>

        {/* Privacy note */}
        <div className="mt-6 p-4 bg-brand-cream/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">🔒 Privacy:</span> This information is used to personalize your coaching experience. 
            Only you can see this data. HR visibility controls coming in Phase 7.
          </p>
        </div>

        {/* Last updated */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Last updated: {new Date(intel.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
