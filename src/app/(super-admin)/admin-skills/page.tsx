// src/app/(super-admin)/admin-skills/page.tsx
import Topbar from '@/components/layout/Topbar'
import SkillsLibrary from '@/components/super-admin/SkillsLibrary'
import { createServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Skills Library · Super Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminSkillsPage() {
  const service = await createServiceClient()

  // 1. All platform skills, newest first
  const { data: skills } = await service
    .from('skills')
    .select('id, name, icon, description, dimensions, is_archived, created_at')
    .eq('source', 'platform')
    .order('created_at', { ascending: false })

  const ids = (skills ?? []).map((s) => s.id)

  // 2. Org clones grouped by source — match by org_skills table
  //    (each clone in skills has source='org_custom' but no link back to the
  //     original — so we approximate clones via name match. Better: org_skills
  //     references the platform skill_id.)
  const cloneCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: enabled } = await service
      .from('org_skills')
      .select('skill_id')
      .in('skill_id', ids)
    for (const row of enabled ?? []) {
      cloneCounts[row.skill_id] = (cloneCounts[row.skill_id] ?? 0) + 1
    }
  }

  // 3. Active users per skill
  const userCounts: Record<string, number> = {}
  if (ids.length) {
    const { data: usages } = await service
      .from('user_skills')
      .select('skill_id')
      .in('skill_id', ids)
      .eq('is_active', true)
    for (const row of usages ?? []) {
      userCounts[row.skill_id] = (userCounts[row.skill_id] ?? 0) + 1
    }
  }

  const enriched = (skills ?? []).map((s) => ({
    ...s,
    dimensions: (s.dimensions as any[]) ?? [],
    org_clones: cloneCounts[s.id] ?? 0,
    active_users: userCounts[s.id] ?? 0,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Skills Library"
        rightSlot={
          <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground bg-brand-cream border border-card-border rounded-full px-2.5 py-1">
            Platform · {enriched.length}
          </span>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <SkillsLibrary skills={enriched as any} />
        </div>
      </main>
    </div>
  )
}
