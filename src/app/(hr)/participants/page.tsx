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

  const { data: participants } = await supabase
    .from('users')
    .select('*, user_skills(count)')
    .eq('org_id', profile?.org_id)
    .eq('role', 'participant')
    .order('joined_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Participants"
        rightSlot={
          <a
            href="/hr/participants/new"
            className="px-4 py-2 bg-brand-dark text-white text-xs font-black rounded-lg hover:bg-brand-dark/90 transition-colors"
          >
            + Add participant
          </a>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <ParticipantsTable participants={participants ?? []} />
      </div>
    </div>
  )
}
