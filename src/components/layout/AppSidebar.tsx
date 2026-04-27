'use client'
// src/components/layout/AppSidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'

interface Props {
  user: User
  // activeSkill and XP data would be fetched from context/store in later phases
  xp?: number
  level?: number
  streak?: number
  hearts?: number
  currentPhase?: 'pre' | 'training' | 'post'
}

const NAV = [
  { href: '/skills',           icon: '🧠', label: 'My Skills',        badge: null },
  { href: '/reality-check',    icon: '🪞', label: 'Reality Check',    badge: null },
  { href: '/progress',         icon: '📈', label: 'Progress',         badge: null },
  { href: '/plan',             icon: '✅', label: 'Action Plan',      badge: null },
  { href: '/rate-colleagues',  icon: '⭐', label: 'Rate Colleagues',  badge: null },
  { href: '/community',        icon: '👥', label: 'Community',        badge: null },
]

const PHASE_STEPS = [
  { key: 'pre',      label: 'Pre',      icon: '🌱' },
  { key: 'training', label: 'Training', icon: '💪' },
  { key: 'post',     label: 'Post',     icon: '🚀' },
]

export default function AppSidebar({
  user,
  xp = 2340,
  level = 7,
  streak = 12,
  hearts = 3,
  currentPhase = 'training',
}: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // XP progress within current level (0-100)
  const xpPct = Math.round(((xp % 500) / 500) * 100)
  // SVG ring calculations
  const radius = 18, circ = 2 * Math.PI * radius
  const ringOffset = circ - (xpPct / 100) * circ

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[232px] bg-brand-dark flex flex-col flex-shrink-0 overflow-hidden relative">
      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10" />

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] bg-brand-yellow rounded-[7px] flex items-center justify-center text-sm font-black text-brand-dark">
            N
          </div>
          <span className="text-[11px] font-black tracking-[2.5px] text-brand-yellow uppercase">
            Nudgeable
          </span>
        </div>
      </div>

      {/* ── User card ───────────────────────────────────────────────────── */}
      <div className="mx-3 my-3.5 bg-white/5 border border-white/[0.08] rounded-[14px] p-3 cursor-pointer hover:bg-white/[0.08] transition-colors flex-shrink-0">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 mb-2.5">
          {/* XP Ring */}
          <div className="relative flex-shrink-0">
            <svg width="42" height="42" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r={radius} fill={user.avatar_color ?? '#623CEA'} />
              <circle
                cx="21" cy="21" r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="21" cy="21" r={radius}
                fill="none"
                stroke="#FFCE00"
                strokeWidth="3"
                strokeDasharray={`${circ}`}
                strokeDashoffset={`${ringOffset}`}
                strokeLinecap="round"
                transform="rotate(-90 21 21)"
                className="transition-all duration-700"
              />
              <text x="21" y="25" textAnchor="middle" fontSize="11" fontWeight="800" fill="white">
                {initials}
              </text>
            </svg>
            {/* Level badge */}
            <span className="absolute -bottom-1 -right-1 bg-brand-yellow text-brand-dark text-[9px] font-black rounded-[5px] px-1 py-px border-2 border-brand-dark">
              L{level}
            </span>
          </div>

          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white truncate">{user.name}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{user.title ?? user.func ?? 'Participant'}</div>
          </div>
        </div>

        {/* Streak + Hearts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[rgba(246,138,41,0.15)] border border-[rgba(246,138,41,0.3)] rounded-full px-2.5 py-1">
            <span className="text-sm animate-streak-pulse">🔥</span>
            <span className="text-[13px] font-extrabold text-[#F68A29]">{streak}</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-[13px]">{i < hearts ? '❤️' : '🖤'}</span>
            ))}
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-2.5">
          <div className="flex justify-between text-[9px] text-white/35 font-semibold tracking-wide mb-1">
            <span>{xp % 500} / 500 XP</span>
            <span>Next: L{level + 1}</span>
          </div>
          <div className="bg-white/[0.08] rounded-full h-[5px] overflow-hidden">
            <div
              className="h-full rounded-full xp-gradient transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-[#ED4551] text-white text-[9px] font-extrabold rounded-[9px] px-1.5 py-px">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* ── Phase tracker ────────────────────────────────────────────────── */}
      <div className="mx-3 mb-3 bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 flex-shrink-0">
        <div className="text-[9px] font-extrabold text-white/30 tracking-[1.2px] uppercase mb-2.5">
          Current Phase
        </div>
        <div className="flex items-center">
          {PHASE_STEPS.map((step, i) => {
            const phaseOrder = ['pre', 'training', 'post']
            const currentIdx = phaseOrder.indexOf(currentPhase)
            const stepIdx    = phaseOrder.indexOf(step.key)
            const isDone     = stepIdx < currentIdx
            const isActive   = stepIdx === currentIdx

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center gap-1 relative">
                {/* Connector line */}
                {i < 2 && (
                  <div
                    className={`absolute top-2.5 left-1/2 w-full h-0.5 ${
                      isDone ? 'bg-gradient-to-r from-brand-green to-brand-green/30' : 'bg-white/[0.08]'
                    }`}
                  />
                )}
                {/* Dot */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] z-10 transition-all duration-300 ${
                    isDone   ? 'bg-brand-green border-brand-green text-white'       :
                    isActive ? 'bg-brand-purple border-brand-purple animate-glow-pulse text-white' :
                               'bg-brand-dark border-white/20 text-white/30'
                  }`}
                >
                  {isDone ? '✓' : step.icon}
                </div>
                <span
                  className={`text-[8px] font-semibold text-center ${
                    isDone   ? 'text-brand-green/70' :
                    isActive ? 'text-white/70'        :
                               'text-white/30'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Logout ──────────────────────────────────────────────────────── */}
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
