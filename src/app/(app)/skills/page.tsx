// src/app/(app)/skills/page.tsx
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import SkillsGrid from '@/components/skills/SkillsGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Skills' }

export default async function SkillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's enrolled skills with skill details
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select(`
      *,
      skill:skills(id, name, icon, description, dimensions)
    `)
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })

  // Fetch available org skills not yet enrolled
  const enrolledIds = (userSkills ?? []).map(us => us.skill_id)

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user!.id)
    .single()

  const { data: availableSkills } = await supabase
    .from('org_skills')
    .select('skill:skills(id, name, icon, description)')
    .eq('org_id', profile?.org_id)
    .eq('enabled', true)
    .not('skill_id', 'in', `(${enrolledIds.length ? enrolledIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="My Skills"
        rightSlot={
          <span className="text-xs text-muted-foreground font-semibold">
            {(userSkills ?? []).length} active
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <SkillsGrid
          userSkills={userSkills ?? []}
          availableSkills={(availableSkills ?? []).map(s => s.skill).filter(Boolean) as any}
        />
      </div>
    </div>
  )
}
