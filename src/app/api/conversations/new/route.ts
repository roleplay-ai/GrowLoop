// src/app/api/conversations/new/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { pathname } = await req.json()
  // Extract userSkillId from path: /skills/<userSkillId>/chat
  const match = pathname?.match(/\/skills\/([^/]+)\/chat/)
  const userSkillId = match?.[1]
  if (!userSkillId) return new NextResponse('Bad request', { status: 400 })

  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('id, phase')
    .eq('id', userSkillId)
    .eq('user_id', user.id)
    .single()
  if (!userSkill) return new NextResponse('Not found', { status: 404 })

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      user_skill_id: userSkillId,
      phase: userSkill.phase,
    })
    .select('id')
    .single()

  if (error || !conv) return new NextResponse(error?.message ?? 'Insert failed', { status: 500 })

  return NextResponse.json({ id: conv.id })
}
