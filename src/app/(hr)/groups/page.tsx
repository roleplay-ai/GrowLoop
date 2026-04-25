// src/app/(hr)/groups/page.tsx
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import GroupsManager from '@/components/hr/GroupsManager'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Groups' }

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()

  const [{ data: groups }, { data: participants }, { data: enabledSkills }] = await Promise.all([
    supabase
      .from('groups')
      .select('*, group_members(user_id)')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name, email, avatar_color, avatar_emoji, title')
      .eq('org_id', profile?.org_id)
      .eq('role', 'participant')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('org_skills')
      .select('skill:skills(id, name, icon, description)')
      .eq('org_id', profile?.org_id)
      .eq('enabled', true)
      .order('added_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Groups" />
      <main className="flex-1 overflow-y-auto p-6">
        <GroupsManager
          groups={groups ?? []}
          participants={participants ?? []}
          enabledSkills={(enabledSkills ?? []).map((r: any) => r.skill).filter(Boolean)}
        />
      </main>
    </div>
  )
}
