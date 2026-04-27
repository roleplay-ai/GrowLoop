// src/app/api/org/colleague-skills/route.ts
//
// Returns the user_skills (with skill dimensions) for a target colleague,
// but only if the current user is connected to them — i.e. the target has
// sent the current user at least one peer survey invite.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SkillDimension } from '@/lib/types'

export const runtime = 'nodejs'

export interface ColleagueSkillDTO {
  userSkillId: string
  skillId: string
  name: string
  icon: string | null
  dimensions: SkillDimension[]
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const targetUserId = req.nextUrl.searchParams.get('userId')
    if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const service = await createServiceClient()

    // Verify connection: target must have sent current user a peer invite.
    const { data: me } = await service
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!me?.email) return NextResponse.json({ skills: [] })

    const { count } = await service
      .from('peer_invites')
      .select(
        '*, reality_check_rounds!inner(user_skills!inner(user_id))',
        { count: 'exact', head: true },
      )
      .eq('peer_email', me.email.toLowerCase())
      .eq('reality_check_rounds.user_skills.user_id', targetUserId)

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Not connected' }, { status: 403 })
    }

    // Fetch target's user_skills with skill details.
    const { data: rows } = await service
      .from('user_skills')
      .select('id, skill:skills(id, name, icon, dimensions)')
      .eq('user_id', targetUserId)
      .neq('phase', 'archived')

    const skills: ColleagueSkillDTO[] = (rows ?? [])
      .map((r) => {
        const s = r.skill as unknown as {
          id: string; name: string; icon: string | null; dimensions: SkillDimension[] | null
        } | null
        if (!s) return null
        return {
          userSkillId: r.id,
          skillId: s.id,
          name: s.name,
          icon: s.icon,
          dimensions: (s.dimensions ?? []) as SkillDimension[],
        }
      })
      .filter(Boolean) as ColleagueSkillDTO[]

    return NextResponse.json({ skills })
  } catch (err) {
    console.error('[colleague-skills]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
