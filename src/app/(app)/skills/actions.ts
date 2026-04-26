'use server'
// src/app/(app)/skills/actions.ts
// Server actions for skill enrollment

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface EnrollResult {
  success: boolean
  userSkillId?: string
  error?: string
}

export async function enrollInSkill(skillId: string): Promise<EnrollResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user's org_id
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { success: false, error: 'User has no organization' }
  }

  // Group-based visibility check: if the user's group has default_skills set,
  // only allow enrollment in those skills.
  const { data: groupRow } = await supabase
    .from('group_members')
    .select('group:groups(default_skills)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const allowedSkillIds = ((groupRow as any)?.group?.default_skills ?? []) as string[]
  if (allowedSkillIds.length > 0 && !allowedSkillIds.includes(skillId)) {
    return { success: false, error: 'This skill is not available for your group' }
  }

  // Verify the skill is accessible for this org
  const serviceClient = await createServiceClient()
  const { data: skill } = await serviceClient
    .from('skills')
    .select('id, source, org_id, is_archived')
    .eq('id', skillId)
    .maybeSingle()

  if (!skill || skill.is_archived) {
    return { success: false, error: 'Skill not found' }
  }

  if (skill.source === 'platform') {
    // Platform skills: must have an org_skills row for this org
    const { data: orgSkill } = await serviceClient
      .from('org_skills')
      .select('skill_id')
      .eq('org_id', profile.org_id)
      .eq('skill_id', skillId)
      .maybeSingle()
    if (!orgSkill) {
      return { success: false, error: 'Skill not available for your organization' }
    }
  } else if (skill.source === 'org_custom') {
    // Org-custom skills: must belong directly to the user's org
    if (skill.org_id !== profile.org_id) {
      return { success: false, error: 'Skill not available for your organization' }
    }
  } else {
    return { success: false, error: 'Skill not available for your organization' }
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('user_skills')
    .select('id')
    .eq('user_id', user.id)
    .eq('skill_id', skillId)
    .single()

  if (existing) {
    return { success: false, error: 'Already enrolled in this skill' }
  }

  // Create user_skill
  const { data: userSkill, error: insertError } = await supabase
    .from('user_skills')
    .insert({
      user_id: user.id,
      skill_id: skillId,
      org_id: profile.org_id,
      phase: 'pre',
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Enrollment error:', insertError)
    return { success: false, error: 'Failed to enroll in skill' }
  }

  // Write to audit log
  await serviceClient.from('audit_log').insert({
    org_id: profile.org_id,
    actor_id: user.id,
    actor_role: 'participant',
    action: 'skill_enrolled',
    target_type: 'user_skills',
    target_id: userSkill.id,
    metadata: { skill_id: skillId },
  })

  revalidatePath('/skills')
  
  return { success: true, userSkillId: userSkill.id }
}
