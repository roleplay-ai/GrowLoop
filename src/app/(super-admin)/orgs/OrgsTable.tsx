'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CreateOrgModal from '@/components/super-admin/CreateOrgModal'
import { suspendOrg, reactivateOrg } from './actions'

interface Org {
  id: string
  name: string
  slug: string
  plan: string
  seat_limit: number
  status: string
  created_at: string
  logo_url?: string | null
  users: { count: number }[]
}

interface Props {
  orgs: Org[]
}

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

export default function OrgsTable({ orgs }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleStatusToggle = async (org: Org) => {
    setActionLoading(org.id)
    try {
      if (org.status === 'active') {
        await suspendOrg(org.id)
      } else {
        await reactivateOrg(org.id)
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle org status:', error)
    }
    setActionLoading(null)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-brand-dark text-white text-xs font-black rounded-lg hover:bg-brand-dark/90 transition-colors"
        >
          + New org
        </button>
      </div>

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
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="text-4xl mb-2">🏢</div>
                  <p className="text-sm text-muted-foreground">No organizations yet</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-3 text-xs font-bold text-brand-purple hover:underline"
                  >
                    Create your first organization
                  </button>
                </td>
              </tr>
            ) : (
              orgs.map(org => (
                <tr key={org.id} className="border-b border-card-border/50 hover:bg-brand-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="w-7 h-7 rounded object-contain" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-brand-purple/10 flex items-center justify-center text-sm font-black text-brand-purple">
                          {org.name[0]}
                        </div>
                      )}
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
                  <td className="px-4 py-3 text-xs font-semibold">{org.users?.[0]?.count ?? 0}</td>
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
                      <a href={`/orgs/${org.id}`} className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5">
                        View
                      </a>
                      <button
                        onClick={() => handleStatusToggle(org)}
                        disabled={actionLoading === org.id}
                        className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded hover:bg-brand-cream disabled:opacity-50"
                      >
                        {actionLoading === org.id ? '...' : org.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateOrgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
