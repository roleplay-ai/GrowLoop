// src/app/(super-admin)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-brand-cream">
      <SuperAdminSidebar user={profile} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
