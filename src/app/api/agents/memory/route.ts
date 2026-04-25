// src/app/api/agents/memory/route.ts
// Read-only listing of the current user's memory store contents.
// Used by the in-app memory viewer.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropic } from '@/lib/anthropic/managedAgents'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('memory_store_id')
    .eq('id', user.id)
    .single()

  if (!profile?.memory_store_id) {
    return NextResponse.json({ items: [] })
  }

  try {
    const client = getAnthropic() as any
    const list = await client.beta.memoryStores.memories.list(profile.memory_store_id, {
      path_prefix: '/',
      order_by: 'path',
      depth: 5,
    })

    const items = (list.data ?? [])
      .filter((m: any) => m.type === 'memory')
      .map((m: any) => ({ id: m.id, path: m.path, updated_at: m.updated_at }))

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[memory list]', e)
    return NextResponse.json({ items: [], error: e?.message })
  }
}

export async function POST(req: NextRequest) {
  // Read a single memory's content
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { memoryId } = await req.json()
  if (!memoryId) return new NextResponse('Bad request', { status: 400 })

  const { data: profile } = await supabase
    .from('users')
    .select('memory_store_id')
    .eq('id', user.id)
    .single()
  if (!profile?.memory_store_id) return new NextResponse('No memory store', { status: 404 })

  try {
    const client = getAnthropic() as any
    const mem = await client.beta.memoryStores.memories.retrieve(memoryId, {
      memory_store_id: profile.memory_store_id,
    })
    return NextResponse.json({ path: mem.path, content: mem.content, updated_at: mem.updated_at })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
