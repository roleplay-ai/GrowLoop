// src/app/(app)/skills/[userSkillId]/intel/page.tsx
//
// Read-only "What the AI Knows About You" page. Renders the structured
// profile JSONB filled in by the slot-flow + side panel. Editable on
// click via the chat-page side panel — this page is just a dashboard.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SLOTS, SECTIONS, type IntelProfile } from '@/lib/agent/slots'

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

  const { data: intel } = await supabase
    .from('agent_intel')
    .select('profile, updated_at')
    .eq('user_id', user!.id)
    .eq('skill_id', skill.id)
    .maybeSingle()

  const profile = (intel?.profile ?? {}) as IntelProfile
  const filledCount = SLOTS.filter((s) => profile[s.key]?.trim()).length

  if (!filledCount) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <span className="text-5xl mb-4">🧠</span>
        <h2 className="text-lg font-bold text-brand-dark mb-2">No Intel Yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Open the coach for {skill.name} and answer a few quick questions. Your
          structured profile shows up here as it gets filled in.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-brand-dark mb-1">What the AI Knows About You</h2>
          <p className="text-sm text-muted-foreground">
            What the coach has captured about <strong>{skill.name}</strong>. Edit any field from
            the panel inside the chat.
          </p>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((section) => {
            const slots = SLOTS.filter((s) => s.section === section.key)
            return (
              <div key={section.key} className="nudge-card rounded-xl p-5">
                <div
                  className="text-[10px] font-extrabold uppercase tracking-[1.2px] mb-3 flex items-center gap-1.5"
                  style={{ color: section.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: section.color }} />
                  {section.icon} {section.label}
                </div>

                {section.key === 'goal' && (
                  <Row icon="🎯" label="Active Skill" value={skill.name} />
                )}

                {slots.map((s) => (
                  <Row key={s.key} icon={s.icon} label={s.label} value={profile[s.key]} hint={s.hint} />
                ))}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-brand-cream/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">🔒 Privacy:</span> This information is used to
            personalize your coaching experience. Only you can see this data.
          </p>
        </div>

        {intel?.updated_at && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Last updated: {new Date(intel.updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  hint,
}: {
  icon: string
  label: string
  value?: string
  hint?: string
}) {
  const filled = !!value?.trim()
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0 border-brand-dark/[0.06]">
      <div className="text-base leading-none pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-brand-orange">
          {label}
        </div>
        {filled ? (
          <p className="text-sm text-brand-dark leading-snug mt-0.5">{value}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground/70 mt-0.5">
            {hint || 'Not captured yet'}
          </p>
        )}
      </div>
    </div>
  )
}
