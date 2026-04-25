'use client'
// src/components/skills/SkillTabs.tsx
// Navigation tabs for enrolled skill pages

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Phase } from '@/lib/types'

interface Props {
  userSkillId: string
  currentPhase: Phase
}

const TABS = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'reality-check', label: 'Reality Check', icon: '📈' },
  { key: 'results', label: 'Results', icon: '🎯' },
  { key: 'plan', label: 'Plan', icon: '📋' },
  { key: 'progress', label: 'Progress', icon: '📊' },
  { key: 'intel', label: 'Intel', icon: '🧠' },
]

export default function SkillTabs({ userSkillId, currentPhase }: Props) {
  const pathname = usePathname()
  const basePath = `/skills/${userSkillId}`

  function getActiveTab() {
    if (pathname.includes('/reality-check')) return 'reality-check'
    if (pathname.includes('/results')) return 'results'
    if (pathname.includes('/plan')) return 'plan'
    if (pathname.includes('/progress')) return 'progress'
    if (pathname.includes('/intel')) return 'intel'
    return 'chat'
  }

  const activeTab = getActiveTab()

  function isTabEnabled(tabKey: string) {
    if (tabKey === 'chat') return true
    if (tabKey === 'intel') return true
    if (tabKey === 'reality-check') return currentPhase !== 'post'
    if (tabKey === 'results') return currentPhase === 'post'
    if (tabKey === 'plan') return currentPhase !== 'pre'
    if (tabKey === 'progress') return currentPhase === 'post'
    return true
  }

  return (
    <nav className="flex gap-1 mt-3 -mb-[1px] flex-wrap">
      {TABS.map(tab => {
        const isActive = activeTab === tab.key
        const enabled = isTabEnabled(tab.key)
        const href = tab.key === 'chat' ? `${basePath}/chat` : `${basePath}/${tab.key}`

        if (!enabled) {
          return (
            <span
              key={tab.key}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground/40 cursor-not-allowed flex items-center gap-1.5"
              title={
                tab.key === 'reality-check'
                  ? 'Already completed for this round'
                  : tab.key === 'results' || tab.key === 'progress'
                    ? 'Available after closing your first Reality Check round'
                    : 'Available after Reality Check'
              }
            >
              <span>{tab.icon}</span>
              {tab.label}
            </span>
          )
        }

        return (
          <Link
            key={tab.key}
            href={href}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 transition-colors
              ${isActive
                ? 'bg-white text-brand-purple border border-card-border border-b-white'
                : 'text-muted-foreground hover:text-brand-dark hover:bg-brand-cream/50'
              }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
