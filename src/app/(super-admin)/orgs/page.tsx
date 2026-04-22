// src/app/(super-admin)/orgs/page.tsx
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Organizations' }

export default async function OrgsPage() {
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, users(count)')
    .order('created_at', { ascending: false })

  const PLAN_STYLES: Record<string, string> = {
    starter:    'bg-brand-cream text-muted-foreground',
    growth:     'bg-brand-purple/10 text-brand-purple',
    enterprise: 'bg-brand-yellow/20 text-brand-dark',
  }
  const STATUS_STYLES: Record<string, string> = {
    active:    'bg-brand-green/10 text-brand-green',
    suspended: 'bg-brand-red/10 text-brand-red',
    inactive:  'bg-muted/20 text-muted-foreground',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Organizations"
        rightSlot={
          <button className="px-4 py-2 bg-brand-dark text-white text-xs font-black rounded-lg hover:bg-brand-dark/90 transition-colors">
            + New org
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="nudge-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                {['Organization', 'Plan', 'Seats', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(orgs ?? []).map(org => (
                <tr key={org.id} className="border-b border-card-border/50 hover:bg-brand-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {org.logo_url
                        ? <img src={org.logo_url} alt="" className="w-7 h-7 rounded object-contain" />
                        : <div className="w-7 h-7 rounded bg-brand-purple/10 flex items-center justify-center text-sm font-black text-brand-purple">
                            {org.name[0]}
                          </div>
                      }
                      <div>
                        <div className="text-sm font-semibold text-brand-dark">{org.name}</div>
                        <div className="text-[10px] text-muted-foreground">{org.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 ${PLAN_STYLES[org.plan] ?? ''}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">{org.seat_limit}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{(org.users as any)?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 ${STATUS_STYLES[org.status] ?? ''}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <a href={`/super-admin/orgs/${org.id}`} className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5">
                        View
                      </a>
                      <button className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded hover:bg-brand-cream">
                        {org.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
