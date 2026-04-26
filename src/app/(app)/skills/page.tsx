// src/app/(app)/skills/page.tsx
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import SkillsGrid from '@/components/skills/SkillsGrid'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'My Skills' }

export default async function SkillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user's enrolled skills with skill details
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select(`
      *,
      skill:skills(id, name, icon, description, dimensions)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  // Group-based visibility: if a group has default_skills set, only show those.
  const { data: groupRow } = await supabase
    .from('group_members')
    .select('group:groups(default_skills)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const allowedSkillIds = ((groupRow as any)?.group?.default_skills ?? []) as string[]

  const visibleUserSkills =
    allowedSkillIds.length > 0
      ? (userSkills ?? []).filter((us: any) => allowedSkillIds.includes(us.skill_id))
      : (userSkills ?? [])

  // Fetch available org skills not yet enrolled (within the visible set if group-scoped)
  const enrolledIds = visibleUserSkills.map((us: any) => us.skill_id)
  const excludeParam = enrolledIds.length ? enrolledIds.join(',') : '00000000-0000-0000-0000-000000000000'

  const service = await createServiceClient()

  let platformQuery = service
    .from('skills')
    .select('id, name, icon, description')
    .eq('source', 'platform')
    .eq('is_archived', false)
    .not('id', 'in', `(${excludeParam})`)

  let customQuery = service
    .from('skills')
    .select('id, name, icon, description')
    .eq('source', 'org_custom')
    .eq('org_id', profile?.org_id)
    .eq('is_archived', false)
    .not('id', 'in', `(${excludeParam})`)

  if (allowedSkillIds.length > 0) {
    platformQuery = platformQuery.in('id', allowedSkillIds)
    customQuery = customQuery.in('id', allowedSkillIds)
  }

  const [{ data: platformSkills }, { data: orgCustomSkills }] = await Promise.all([
    platformQuery,
    customQuery,
  ])

  const allAvailableSkills = [
    ...(platformSkills ?? []),
    ...(orgCustomSkills ?? []),
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="My Skills"
        rightSlot={
          <span className="text-xs text-muted-foreground font-semibold">
            {visibleUserSkills.length} active
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <SkillsGrid
          userSkills={visibleUserSkills}
          availableSkills={allAvailableSkills as any}
        />
      </div>
    </div>
  )
}
