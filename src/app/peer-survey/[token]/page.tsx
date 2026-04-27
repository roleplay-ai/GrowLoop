// src/app/peer-survey/[token]/page.tsx
//
// Public, no-auth peer survey landing. Looks up the invite by token via the
// service-role client (RLS would otherwise block an anonymous reader). Renders
// either an error state, an "already submitted" thank-you, or the rating form.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { SkillDimension } from '@/lib/types'
import PeerSurveyForm from './PeerSurveyForm'

interface Props {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = {
  title: 'Peer Survey',
  description: 'Anonymous skill feedback — your response is private.',
}

export default async function PeerSurveyPage({ params }: Props) {
  const { token } = await params
  const supabase = await createServiceClient()

  const { data: invite } = await supabase
    .from('peer_invites')
    .select(
      `
      id, status, peer_name, peer_email, peer_relation, submitted_at,
      reality_check_id,
      reality_check:reality_check_rounds(
        id,
        user_skill:user_skills(
          id,
          user:users(name),
          skill:skills(name, icon, dimensions)
        )
      )
    `,
    )
    .eq('token', token)
    .maybeSingle()

  // Friendly error states.
  if (!invite) {
    return (
      <SurveyShell>
        <ErrorCard
          icon="🔗"
          title="This survey link isn't valid"
          message="The link may be mistyped, or it may belong to a round that's already closed. Ask the person who shared it for a fresh link."
        />
      </SurveyShell>
    )
  }

  if (invite.status === 'submitted') {
    return (
      <SurveyShell>
        <ErrorCard
          icon="✅"
          title="You've already submitted this survey"
          message="Thanks again! Each peer can only respond once per round to keep things clean."
        />
      </SurveyShell>
    )
  }

  if (invite.status === 'expired') {
    return (
      <SurveyShell>
        <ErrorCard
          icon="⌛"
          title="This survey has expired"
          message="The Reality Check round has been closed. Reach out to the requester if you'd still like to share feedback."
        />
      </SurveyShell>
    )
  }

  const round = invite.reality_check as unknown as
    | {
        id: string
        user_skill: {
          id: string
          user: { name: string } | null
          skill: { name: string; icon: string | null; dimensions: SkillDimension[] | null } | null
        } | null
      }
    | null

  const userSkill = round?.user_skill ?? null
  const participantName = userSkill?.user?.name ?? 'A teammate'
  const skillName = userSkill?.skill?.name ?? 'this skill'
  const skillIcon = userSkill?.skill?.icon ?? null
  const dimensions = (userSkill?.skill?.dimensions ?? []) as SkillDimension[]

  if (!dimensions.length) {
    return (
      <SurveyShell>
        <ErrorCard
          icon="🛠️"
          title="This survey isn't ready yet"
          message="The skill being rated is missing its dimensions. Please ask the requester to retry — once their setup is complete the link will work."
        />
      </SurveyShell>
    )
  }

  return (
    <SurveyShell>
      <PeerSurveyForm
        token={token}
        participantName={participantName}
        skillName={skillName}
        skillIcon={skillIcon}
        dimensions={dimensions}
      />
    </SurveyShell>
  )
}

function SurveyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <header className="px-6 py-4 border-b border-card-border bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/rate-colleagues"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-dark transition-colors"
            >
              <span>←</span>
              <span>Back</span>
            </Link>
            <div className="w-px h-4 bg-card-border" />
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <span className="font-black text-brand-dark">Nudgeable</span>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-purple bg-brand-purple/10 px-2.5 py-1 rounded-full">
            Anonymous
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="px-6 py-4 text-center text-[11px] text-muted-foreground">
        Your identity is never shared. Aggregate-only averages are returned to the requester.
      </footer>
    </div>
  )
}

function ErrorCard({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="max-w-md mx-auto p-6 text-center mt-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h1 className="text-xl font-black text-brand-dark mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </div>
  )
}
