// src/app/(app)/skills/explore/[skillId]/page.tsx
// Skill preview page before enrollment

import { createClient, createServiceClient } from '@/lib/supabase/server'
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

  const orgId = profile?.org_id

  // Access check depends on skill source:
  // - Platform skills: must appear in org_skills for the user's org
  // - Org-custom skills: must belong directly to the user's org
  if (skill.source === 'platform') {
    const service = await createServiceClient()
    const { data: orgSkill } = await service
      .from('org_skills')
      .select('skill_id')
      .eq('org_id', orgId)
      .eq('skill_id', skillId)
      .maybeSingle()
    if (!orgSkill) notFound()
  } else if (skill.source === 'org_custom') {
    if (skill.org_id !== orgId || skill.is_archived) notFound()
  } else {
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
