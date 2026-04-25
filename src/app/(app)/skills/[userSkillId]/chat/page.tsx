// src/app/(app)/skills/[userSkillId]/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import AgentIntelPanelWrapper from '@/components/chat/AgentIntelPanelWrapper'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ userSkillId: string }>
  searchParams: Promise<{ c?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Coach · Nudgeable' }
}

export default async function ChatPage({ params, searchParams }: Props) {
  const { userSkillId } = await params
  const { c: requestedConversationId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('*, skill:skills(id, name, icon, description, dimensions)')
    .eq('id', userSkillId)
    .eq('user_id', user!.id)
    .single()

  if (!userSkill) notFound()

  const skill = userSkill.skill as any

  // Fetch all conversations for sidebar
  const { data: allConversations } = await supabase
    .from('conversations')
    .select('id, created_at, phase')
    .eq('user_id', user!.id)
    .eq('user_skill_id', userSkillId)
    .order('created_at', { ascending: false })

  // Pick or create active conversation
  let activeId = requestedConversationId
  if (!activeId) {
    activeId = allConversations?.[0]?.id
  }
  if (!activeId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user_id: user!.id,
        user_skill_id: userSkillId,
        phase: userSkill.phase,
      })
      .select('id')
      .single()
    activeId = newConv?.id
  }

  // Messages for active conversation
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', activeId)
    .order('created_at', { ascending: true })

  // Build preview snippets per conversation (first user message)
  const conversationPreviews = await Promise.all(
    (allConversations ?? []).map(async (conv) => {
      const { data: firstMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', conv.id)
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      return {
        id: conv.id,
        created_at: conv.created_at,
        phase: conv.phase,
        preview: firstMsg?.content?.slice(0, 80),
      }
    }),
  )

  // Agent intel
  const { data: intel } = await supabase
    .from('agent_intel')
    .select('current_level, context, motivations, blockers, raw_summary, updated_at')
    .eq('user_id', user!.id)
    .eq('skill_id', skill?.id)
    .maybeSingle()

  return (
    <div className="flex h-full overflow-hidden bg-brand-cream/30">
      <ChatWindow
        userSkillId={userSkillId}
        conversationId={activeId ?? ''}
        initialMessages={messages ?? []}
        skillName={skill?.name ?? 'Skill'}
        skillIcon={skill?.icon}
        phase={userSkill.phase}
      />
      <AgentIntelPanelWrapper
        intel={intel ?? null}
        skillName={skill?.name ?? 'this skill'}
        conversations={conversationPreviews}
        activeConversationId={activeId}
      />
    </div>
  )
}
