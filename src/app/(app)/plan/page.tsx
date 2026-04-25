// src/app/(app)/plan/page.tsx
// DUMMY UI — hardcoded sample data, no DB calls.
import Topbar from '@/components/layout/Topbar'
import ActionPlanBoard from '@/components/plan/ActionPlanBoard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Action Plan' }

export default function PlanPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Action Plan"
        rightSlot={
          <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground bg-brand-cream border border-card-border rounded-full px-2.5 py-1">
            Week of Apr 21
          </span>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <ActionPlanBoard />
        </div>
      </main>
    </div>
  )
}
