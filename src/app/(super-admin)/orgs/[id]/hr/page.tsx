// src/app/(super-admin)/orgs/[id]/hr/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import HRManagement from './HRManagement'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', id)
    .single()

  return { title: `HR Users - ${org?.name ?? 'Organization'}` }
}

export default async function HRPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (!org) notFound()

  const { data: hrUsers } = await supabase
    .from('users')
    .select('*')
    .eq('org_id', id)
    .eq('role', 'hr')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title={`${org.name} - HR Users`}
        rightSlot={
          <a href="/orgs" className="text-xs font-semibold text-brand-purple hover:underline">
            ← Back to Organizations
          </a>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <HRManagement org={org} hrUsers={hrUsers ?? []} />
      </div>
    </div>
  )
}
