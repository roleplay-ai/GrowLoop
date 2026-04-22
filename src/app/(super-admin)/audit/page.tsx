// src/app/(super-admin)/audit/page.tsx
import Topbar from '@/components/layout/Topbar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Log' }

export default function AuditPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Audit Log" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="nudge-card rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-brand-dark mb-2">Audit Log</h2>
            <p className="text-sm text-muted-foreground mb-4">
              View all system actions across organizations and users.
            </p>
            <span className="inline-block text-[10px] font-bold text-brand-purple bg-brand-purple/10 rounded-full px-3 py-1">
              Coming Soon
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
