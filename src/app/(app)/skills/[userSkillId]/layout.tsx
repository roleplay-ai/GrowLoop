// src/app/(app)/skills/[userSkillId]/layout.tsx
// Layout with navigation tabs for enrolled skill pages

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SkillTabs from '@/components/skills/SkillTabs'

interface Props {
  children: React.ReactNode
  params: Promise<{ userSkillId: string }>
}

export default async function UserSkillLayout({ children, params }: Props) {
  const { userSkillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user skill with skill details
  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('*, skill:skills(id, name, icon)')
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  const skill = userSkill.skill as { id: string; name: string; icon?: string }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with breadcrumb and phase */}
      <header className="bg-white border-b border-card-border px-6 py-3 flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link href="/skills" className="hover:text-brand-purple transition-colors">
            Skills
          </Link>
          <span>/</span>
          <span className="text-brand-dark font-medium">{skill?.name}</span>
        </div>

        {/* Title and phase */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{skill?.icon ?? '🧠'}</span>
            <h1 className="text-lg font-extrabold text-brand-dark">{skill?.name}</h1>
            <span className={`phase-badge phase-badge-${userSkill.phase}`}>
              {userSkill.phase === 'pre' ? 'Pre-Training' : 
               userSkill.phase === 'training' ? 'In Training' : 'Post-Training'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Round {userSkill.rc_round}</span>
            {userSkill.current_peer && (
              <span className="font-semibold text-brand-dark">
                Score: {userSkill.current_peer.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <SkillTabs userSkillId={userSkillId} currentPhase={userSkill.phase} />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
