// src/app/(super-admin)/flags/page.tsx
import Topbar from '@/components/layout/Topbar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Feature Flags' }

export default function FlagsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Feature Flags" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="nudge-card rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🚩</div>
            <h2 className="text-xl font-bold text-brand-dark mb-2">Feature Flags</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Toggle features on/off for specific organizations or globally.
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
