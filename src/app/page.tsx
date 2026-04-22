// src/app/page.tsx
// Root page - redirects based on auth status
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Redirect based on role
  // Note: (app), (hr), (super-admin) are route groups - parentheses don't appear in URL
  const destinations: Record<string, string> = {
    super_admin: '/orgs',
    hr: '/insights',
    participant: '/skills',
  }

  const role = profile?.role
  if (role && destinations[role]) {
    redirect(destinations[role])
  }

  // Fallback to login if no valid role
  redirect('/login')
}
