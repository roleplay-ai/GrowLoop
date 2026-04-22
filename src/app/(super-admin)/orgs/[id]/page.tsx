// src/app/(super-admin)/orgs/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
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

  return { title: org?.name ?? 'Organization' }
}

export default async function OrgDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (!org) notFound()

  // Get counts
  const { count: hrCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', id)
    .eq('role', 'hr')

  const { count: participantCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', id)
    .eq('role', 'participant')

  const { count: skillCount } = await supabase
    .from('org_skills')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', id)
    .eq('enabled', true)

  const PLAN_STYLES: Record<string, string> = {
    starter: 'bg-brand-cream text-muted-foreground',
    growth: 'bg-brand-purple/10 text-brand-purple',
    enterprise: 'bg-brand-yellow/20 text-brand-dark',
  }

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-brand-green/10 text-brand-green',
    suspended: 'bg-red-500/10 text-red-500',
    inactive: 'bg-muted/20 text-muted-foreground',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title={org.name}
        rightSlot={
          <a href="/orgs" className="text-xs font-semibold text-brand-purple hover:underline">
            ← Back to Organizations
          </a>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Org Header Card */}
          <div className="nudge-card rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-16 h-16 rounded-lg object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-brand-purple/10 flex items-center justify-center text-2xl font-black text-brand-purple">
                    {org.name[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-brand-dark">{org.name}</h1>
                  <p className="text-xs text-muted-foreground">{org.slug}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 ${PLAN_STYLES[org.plan] ?? ''}`}>
                      {org.plan}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 ${STATUS_STYLES[org.status] ?? ''}`}>
                      {org.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Created {new Date(org.created_at).toLocaleDateString()}</div>
                <div className="mt-1">Seat limit: {org.seat_limit}</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="nudge-card rounded-xl p-5">
              <div className="text-3xl font-black text-brand-purple">{hrCount ?? 0}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-1">HR Admins</div>
            </div>
            <div className="nudge-card rounded-xl p-5">
              <div className="text-3xl font-black text-brand-green">{participantCount ?? 0}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-1">Participants</div>
            </div>
            <div className="nudge-card rounded-xl p-5">
              <div className="text-3xl font-black text-brand-orange">{skillCount ?? 0}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-1">Active Skills</div>
            </div>
          </div>

          {/* Management Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/orgs/${id}/hr`}
              className="nudge-card rounded-xl p-5 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <div className="font-bold text-brand-dark group-hover:text-brand-purple transition-colors">
                    Manage HR Users
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add, edit, or deactivate HR administrators
                  </div>
                </div>
              </div>
            </Link>

            <div className="nudge-card rounded-xl p-5 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center text-xl">
                  🧠
                </div>
                <div>
                  <div className="font-bold text-brand-dark">Manage Skills</div>
                  <div className="text-xs text-muted-foreground">
                    Configure skills for this organization
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">Coming in Phase 6</div>
            </div>
          </div>

          {/* Audit Log Preview */}
          <div className="nudge-card rounded-xl p-5">
            <h2 className="font-bold text-brand-dark mb-3">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">Audit log viewer coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
