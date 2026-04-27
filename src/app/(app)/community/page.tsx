// src/app/(app)/community/page.tsx

import type { Metadata } from 'next'
import Topbar from '@/components/layout/Topbar'

export const metadata: Metadata = { title: 'Community' }

export default function CommunityPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Community" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-brand-dark mb-2">Community</h2>
            <p className="text-brand-dark/50">
              Coming soon! Connect with peers on similar skill journeys.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
