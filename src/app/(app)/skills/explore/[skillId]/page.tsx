// src/app/(app)/skills/explore/[skillId]/page.tsx
// Skill preview page before enrollment

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import SkillPreview from '@/components/skills/SkillPreview'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ skillId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { skillId } = await params
  const supabase = await createClient()
  const { data: skill } = await supabase
    .from('skills')
    .select('name')
    .eq('id', skillId)
    .single()

  return { title: skill?.name ?? 'Skill Details' }
}

export default async function SkillDetailPage({ params }: Props) {
  const { skillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch skill details
  const { data: skill, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single()

  if (error || !skill) notFound()

  // Get user's org_id
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  // Check if skill is enabled for user's org
  const { data: orgSkill } = await supabase
    .from('org_skills')
    .select('enabled')
    .eq('org_id', profile?.org_id)
    .eq('skill_id', skillId)
    .single()

  if (!orgSkill?.enabled) {
    notFound()
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('user_skills')
    .select('id')
    .eq('user_id', user.id)
    .eq('skill_id', skillId)
    .single()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Skill Details"
        rightSlot={
          <a
            href="/skills"
            className="text-xs font-semibold text-brand-purple hover:underline"
          >
            ← Back to Skills
          </a>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <SkillPreview
          skill={skill}
          isEnrolled={!!existingEnrollment}
          existingUserSkillId={existingEnrollment?.id}
        />
      </div>
    </div>
  )
}
