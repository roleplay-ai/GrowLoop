'use client'
// src/components/layout/SuperAdminSidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'

interface Props { user: User }

const NAV = [
  { href: '/orgs',         icon: '🏢', label: 'Organizations', badge: null },
  { href: '/admin-skills', icon: '🧠', label: 'Skills Library', badge: null },
  { href: '/prompts',      icon: '🤖', label: 'AI Prompts',     badge: null },
  { href: '/billing',      icon: '💳', label: 'Billing',        badge: null },
  { href: '/flags',        icon: '🚩', label: 'Feature Flags',  badge: null },
  { href: '/audit',        icon: '📋', label: 'Audit Log',      badge: null },
  { href: '/llm',          icon: '⚡', label: 'LLM Usage',      badge: null },
]

export default function SuperAdminSidebar({ user }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[232px] bg-brand-dark flex flex-col flex-shrink-0 overflow-hidden relative">
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10" />

      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] bg-brand-yellow rounded-[7px] flex items-center justify-center text-sm font-black text-brand-dark">N</div>
          <span className="text-[11px] font-black tracking-[2.5px] text-brand-yellow uppercase">Nudgeable</span>
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 bg-brand-red/20 border border-brand-red/30 rounded px-1.5 py-0.5">
          <span className="text-[8px] font-black uppercase tracking-wide text-brand-red">Super Admin</span>
        </div>
      </div>

      {/* User */}
      <div className="mx-3 my-3 bg-white/5 border border-white/[0.08] rounded-xl p-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center text-xs font-black text-white">
            {user.name?.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="text-[13px] font-bold text-white">{user.name}</div>
            <div className="text-[10px] text-white/40">Platform Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className="mx-3 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-white/30 text-xs font-semibold hover:text-white/60 hover:bg-white/5 transition-all flex-shrink-0 relative z-20"
      >
        <span>↩</span><span>Sign out</span>
      </button>
    </aside>
  )
}
