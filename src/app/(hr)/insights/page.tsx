// src/app/(hr)/insights/page.tsx
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import HRInsightsDashboard from '@/components/hr/HRInsightsDashboard'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Insights' }

export default async function HRInsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id

  // KPIs
  const [
    { count: totalParticipants },
    { count: activeSkills },
    { count: rcRounds },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'participant').eq('status', 'active'),
    supabase.from('user_skills').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
    supabase.from('reality_check_rounds').select('*, user_skills!inner(org_id)', { count: 'exact', head: true }).eq('user_skills.org_id', orgId),
  ])

  // Latest skill insights
  const { data: insights } = await supabase
    .from('skill_insights')
    .select('*, skill:skills(name, icon)')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })

  // Top scorers + growers per skill via user_skills
  const { data: topSkillData } = await supabase
    .from('user_skills')
    .select('*, user:users(name, avatar_emoji, avatar_color), skill:skills(name, icon)')
    .eq('org_id', orgId)
    .not('current_peer', 'is', null)
    .order('current_peer', { ascending: false })
    .limit(20)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="HR Insights"
        rightSlot={
          <button className="text-xs font-bold text-brand-purple border border-brand-purple/20 rounded-lg px-3 py-1.5 hover:bg-brand-purple/5 transition-colors">
            Export CSV
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <HRInsightsDashboard
          kpis={{
            participants:  totalParticipants ?? 0,
            activeSkills:  activeSkills ?? 0,
            rcRounds:      rcRounds ?? 0,
            avgGrowth:     0.4,  // TODO: compute from user_skills aggregates
          }}
          insights={insights ?? []}
          topSkillData={topSkillData ?? []}
        />
      </div>
    </div>
  )
}
