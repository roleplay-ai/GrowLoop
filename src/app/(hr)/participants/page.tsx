// src/app/(hr)/participants/page.tsx
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import ParticipantsTable from '@/components/hr/ParticipantsTable'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Participants' }

export default async function ParticipantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile }  = await supabase.from('users').select('org_id').eq('id', user!.id).single()

  const [{ data: participants }, { data: groups }, { data: org }] = await Promise.all([
    supabase
      .from('users')
      .select('*, user_skills(count), group_members(group_id)')
      .eq('org_id', profile?.org_id)
      .eq('role', 'participant')
      .order('joined_at', { ascending: false }),
    supabase
      .from('groups')
      .select('id, name')
      .eq('org_id', profile?.org_id)
      .order('name'),
    supabase
      .from('organizations')
      .select('seat_limit, name')
      .eq('id', profile?.org_id)
      .single(),
  ])

  const activeCount = (participants ?? []).filter(p => p.status !== 'inactive').length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Participants"
        rightSlot={
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="font-bold text-brand-dark">{activeCount}</span>
              <span className="text-muted-foreground"> / {org?.seat_limit ?? '∞'} seats used</span>
            </div>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <ParticipantsTable participants={participants ?? []} groups={groups ?? []} />
      </div>
    </div>
  )
}
