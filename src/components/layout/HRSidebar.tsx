'use client'
// src/components/layout/HRSidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User, Organization } from '@/lib/types'

interface Props {
  user: User
  org?: Partial<Organization>
}

const NAV = [
  { href: '/insights',     icon: '📊', label: 'Insights',     badge: null },
  { href: '/participants',  icon: '👥', label: 'Participants', badge: null },
  { href: '/groups',        icon: '🗂️',  label: 'Groups',      badge: null },
  { href: '/hr-skills',     icon: '🧠', label: 'Skills',      badge: null },
  { href: '/settings',      icon: '⚙️',  label: 'Settings',    badge: null },
]

export default function HRSidebar({ user, org }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

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
        {org?.name && (
          <div className="mt-2 text-[10px] text-white/30 font-semibold truncate">{org.name}</div>
        )}
      </div>

      {/* User card */}
      <div className="mx-3 my-3.5 bg-white/5 border border-white/[0.08] rounded-[14px] p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: user.avatar_color ?? '#623CEA' }}
          >
            {user.avatar_emoji ?? initials}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white truncate">{user.name}</div>
            <div className="text-[10px] text-white/40 mt-0.5">HR Admin</div>
          </div>
        </div>

        {/* Plan badge */}
        {org?.plan && (
          <div className="mt-2.5 inline-flex items-center gap-1 bg-brand-yellow/10 border border-brand-yellow/20 rounded-full px-2.5 py-0.5">
            <span className="text-[9px] font-black uppercase tracking-wide text-brand-yellow">{org.plan} plan</span>
          </div>
        )}
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
        <span>↩</span>
        <span>Sign out</span>
      </button>
    </aside>
  )
}
