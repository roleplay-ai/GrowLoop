// src/app/api/org/peers/route.ts
//
// Returns the same-org user directory the participant can pick peers from.
// Excludes the requester themselves and inactive accounts. Includes
// participants, HR, and (rarely) super_admin so a participant can ask their
// manager — relation is captured separately on the invite.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export interface OrgPeerDTO {
  id: string
  name: string
  email: string
  title: string | null
  func: string | null
  role: 'participant' | 'hr' | 'super_admin'
  avatar_emoji: string | null
  avatar_color: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (!me?.org_id) {
      return NextResponse.json({ peers: [] })
    }

    const { data: rows, error } = await supabase
      .from('users')
      .select('id, name, email, title, func, role, avatar_emoji, avatar_color, status')
      .eq('org_id', me.org_id)
      .neq('id', user.id)
      .neq('status', 'inactive')
      .order('name', { ascending: true })

    if (error) {
      console.error('[org/peers] query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const peers: OrgPeerDTO[] = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      title: r.title,
      func: r.func,
      role: r.role as OrgPeerDTO['role'],
      avatar_emoji: r.avatar_emoji,
      avatar_color: r.avatar_color,
    }))

    return NextResponse.json({ peers })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[org/peers]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
