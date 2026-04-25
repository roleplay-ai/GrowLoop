// src/app/(app)/progress/page.tsx
// DUMMY UI — hardcoded sample data, no DB calls.
import Topbar from '@/components/layout/Topbar'
import ProgressDashboard from '@/components/progress/ProgressDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Progress' }

export default function ProgressPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Progress"
        rightSlot={
          <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground bg-brand-cream border border-card-border rounded-full px-2.5 py-1">
            Q2 · Growth Loop
          </span>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <ProgressDashboard />
        </div>
      </main>
    </div>
  )
}
