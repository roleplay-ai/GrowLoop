// src/app/(super-admin)/orgs/page.tsx
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import OrgsTable from './OrgsTable'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Organizations' }

export default async function OrgsPage() {
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, users(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Organizations" />
      <div className="flex-1 overflow-y-auto p-6">
        <OrgsTable orgs={orgs ?? []} />
      </div>
    </div>
  )
}
