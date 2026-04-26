// src/app/(app)/community/page.tsx
//
// Community page — shows pending peer survey requests sent to the logged-in
// user. When someone picks you as a rater in their Reality Check, a card
// appears here. Clicking "Rate now" opens the existing peer-survey page.

import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { SkillDimension } from '@/lib/types'

export const metadata: Metadata = { title: 'Community' }

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch pending invites where peer_email matches the current user.
  // We use the user's email (from auth) to look up invites created for them.
  const { data: me } = await supabase
    .from('users')
    .select('email')
    .eq('id', user!.id)
    .single()

  const { data: invites } = me?.email
    ? await supabase
        .from('peer_invites')
        .select(`
          id, token, status, submitted_at,
          reality_check:reality_check_rounds(
            id,
            user_skill:user_skills(
              id,
              user:users(name, avatar_emoji, avatar_color),
              skill:skills(name, icon, dimensions)
            )
          )
        `)
        .eq('peer_email', me.email.toLowerCase())
        .order('created_at', { ascending: false })
    : { data: [] }

  const pending = (invites ?? []).filter((i) => i.status === 'pending')
  const done = (invites ?? []).filter((i) => i.status === 'submitted')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Community" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Pending surveys */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-black text-brand-dark">Awaiting your feedback</h2>
              {pending.length > 0 && (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-brand-purple text-white">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="nudge-card rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-sm font-bold text-brand-dark">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When a colleague picks you as a rater, their survey request will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((inv) => {
                  const round = inv.reality_check as unknown as {
                    user_skill: {
                      user: { name: string; avatar_emoji: string | null; avatar_color: string | null } | null
                      skill: { name: string; icon: string | null; dimensions: SkillDimension[] | null } | null
                    } | null
                  } | null
                  const requester = round?.user_skill?.user
                  const skill = round?.user_skill?.skill
                  const initials = requester?.name
                    ? requester.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                    : '?'

                  return (
                    <div
                      key={inv.id}
                      className="nudge-card rounded-2xl p-4 flex items-center gap-4"
                    >
                      {/* Requester avatar */}
                      <div
                        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-black"
                        style={{ backgroundColor: requester?.avatar_color ?? '#623CEA' }}
                      >
                        {requester?.avatar_emoji || initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-brand-dark truncate">
                          {requester?.name ?? 'A teammate'} wants your feedback
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {skill?.icon ?? '🧠'} {skill?.name ?? 'a skill'} · anonymous &amp; takes ~2 min
                        </div>
                      </div>

                      {/* CTA */}
                      <Link
                        href={`/peer-survey/${inv.token}`}
                        className="flex-shrink-0 px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-black
                                   hover:bg-brand-purple/90 transition-all whitespace-nowrap"
                      >
                        Rate now →
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Completed surveys */}
          {done.length > 0 && (
            <section>
              <h2 className="text-base font-black text-brand-dark mb-4">Feedback you&apos;ve given</h2>
              <div className="space-y-2">
                {done.map((inv) => {
                  const round = inv.reality_check as unknown as {
                    user_skill: {
                      user: { name: string; avatar_emoji: string | null; avatar_color: string | null } | null
                      skill: { name: string; icon: string | null } | null
                    } | null
                  } | null
                  const requester = round?.user_skill?.user
                  const skill = round?.user_skill?.skill
                  const initials = requester?.name
                    ? requester.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                    : '?'

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-card-border bg-white/60"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-black opacity-70"
                        style={{ backgroundColor: requester?.avatar_color ?? '#623CEA' }}
                      >
                        {requester?.avatar_emoji || initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-brand-dark/70 truncate">
                          {requester?.name ?? 'A teammate'}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {skill?.icon ?? '🧠'} {skill?.name ?? 'a skill'}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-brand-green">✅ Done</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
