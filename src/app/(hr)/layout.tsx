// src/app/(hr)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HRSidebar from '@/components/layout/HRSidebar'

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, organizations(name, logo_url, plan)')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr') redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-brand-cream">
      <HRSidebar user={profile} org={profile.organizations} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
