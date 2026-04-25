// src/app/(hr)/hr-skills/page.tsx
import Topbar from '@/components/layout/Topbar'
import HRSkillsBrowser from '@/components/hr/HRSkillsBrowser'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Skills · HR' }
export const dynamic = 'force-dynamic'

export default async function HRSkillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'hr' || !profile.org_id) redirect('/login')

  const orgId = profile.org_id
  const service = await createServiceClient()

  // 1. Platform skills (catalogue) + which are enabled for this org
  const [{ data: platformSkills }, { data: orgEnabled }] = await Promise.all([
    service
      .from('skills')
      .select('id, name, icon, description, dimensions, is_archived')
      .eq('source', 'platform')
      .eq('is_archived', false)
      .order('name'),
    service.from('org_skills').select('skill_id, enabled').eq('org_id', orgId),
  ])

  const enabledMap = new Map<string, boolean>()
  for (const r of orgEnabled ?? []) enabledMap.set(r.skill_id, r.enabled)

  const platform = (platformSkills ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    dimensions: (s.dimensions as any[]) ?? [],
    enabled: enabledMap.get(s.id) ?? false,
  }))

  // 2. Org-custom skills
  const { data: orgSkillsRaw } = await service
    .from('skills')
    .select('id, name, icon, description, dimensions, is_archived, created_at')
    .eq('source', 'org_custom')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  const orgIds = (orgSkillsRaw ?? []).map((s) => s.id)
  const userCounts: Record<string, number> = {}
  if (orgIds.length) {
    const { data: usages } = await service
      .from('user_skills')
      .select('skill_id')
      .in('skill_id', orgIds)
      .eq('is_active', true)
    for (const row of usages ?? []) {
      userCounts[row.skill_id] = (userCounts[row.skill_id] ?? 0) + 1
    }
  }

  const orgSkills = (orgSkillsRaw ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    dimensions: (s.dimensions as any[]) ?? [],
    is_archived: s.is_archived,
    created_at: s.created_at,
    active_users: userCounts[s.id] ?? 0,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Skills"
        rightSlot={
          <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground bg-brand-cream border border-card-border rounded-full px-2.5 py-1">
            HR · {orgSkills.filter((s) => !s.is_archived).length} custom
          </span>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <HRSkillsBrowser platform={platform} orgSkills={orgSkills as any} />
        </div>
      </main>
    </div>
  )
}
