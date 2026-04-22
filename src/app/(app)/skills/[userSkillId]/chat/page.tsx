// src/app/(app)/skills/[userSkillId]/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import ChatWindow from '@/components/chat/ChatWindow'
import type { Metadata } from 'next'

interface Props { params: { userSkillId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Skill Chat' }
}

export default async function ChatPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('*, skill:skills(id, name, icon, description, dimensions)')
    .eq('id', params.userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  // Fetch or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user!.id)
    .eq('user_skill_id', params.userSkillId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ user_id: user!.id, user_skill_id: params.userSkillId, phase: userSkill.phase })
      .select('id')
      .single()
    conversation = newConv
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation?.id)
    .order('created_at', { ascending: true })

  const skill = userSkill.skill as any

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title={`${skill?.icon ?? '🧠'} ${skill?.name}`}
        phase={userSkill.phase}
        rightSlot={
          <span className="text-xs text-muted-foreground font-semibold">
            Round {userSkill.rc_round}
          </span>
        }
      />
      <ChatWindow
        userSkillId={params.userSkillId}
        conversationId={conversation?.id ?? ''}
        initialMessages={messages ?? []}
        skillName={skill?.name}
        phase={userSkill.phase}
      />
    </div>
  )
}
