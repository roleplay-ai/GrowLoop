'use server'
// src/app/(super-admin)/admin-skills/actions.ts
//
// Platform-skill mutations. Only super_admin can hit these — verifySuperAdmin
// guards every action. Mutations write through the service-role client so
// RLS doesn't block legitimate admin work.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// ── Validation ──────────────────────────────────────────────────────────────
const dimensionSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Dimension name must be at least 2 chars').max(60),
  description: z.string().max(500).optional().default(''),
  rubric: z
    .object({
      '1': z.string().max(300).optional().default(''),
      '2': z.string().max(300).optional().default(''),
      '3': z.string().max(300).optional().default(''),
      '4': z.string().max(300).optional().default(''),
      '5': z.string().max(300).optional().default(''),
    })
    .optional()
    .default({ '1': '', '2': '', '3': '', '4': '', '5': '' }),
})

const skillSchema = z.object({
  name: z.string().min(2, 'Name must be 2-60 characters').max(60),
  icon: z.string().max(8).optional().default('🧠'),
  description: z.string().max(1000).optional().default(''),
  dimensions: z.array(dimensionSchema).max(6, 'Up to 6 dimensions allowed').default([]),
})

export type SkillFormPayload = z.infer<typeof skillSchema>

// ── Auth helper ─────────────────────────────────────────────────────────────
async function verifySuperAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', user: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return { error: 'Unauthorized: super_admin required', user: null }
  }
  return { error: null, user }
}

async function audit(
  supabase: any,
  action: string,
  targetId: string,
  actorId: string,
  details: Record<string, any> = {},
) {
  await supabase.from('audit_log').insert({
    action,
    target_type: 'skill',
    target_id: targetId,
    actor_id: actorId,
    details,
  })
}

function parsePayload(formData: FormData): SkillFormPayload {
  const dimsRaw = formData.get('dimensions')
  let dims: any[] = []
  if (typeof dimsRaw === 'string' && dimsRaw.trim()) {
    try {
      dims = JSON.parse(dimsRaw)
    } catch {
      dims = []
    }
  }
  return {
    name: String(formData.get('name') ?? '').trim(),
    icon: (String(formData.get('icon') ?? '').trim() || '🧠'),
    description: String(formData.get('description') ?? '').trim(),
    dimensions: dims.map((d) => ({
      id: d.id ?? randomUUID(),
      name: String(d.name ?? '').trim(),
      description: String(d.description ?? '').trim(),
      rubric: {
        '1': String(d.rubric?.['1'] ?? '').trim(),
        '2': String(d.rubric?.['2'] ?? '').trim(),
        '3': String(d.rubric?.['3'] ?? '').trim(),
        '4': String(d.rubric?.['4'] ?? '').trim(),
        '5': String(d.rubric?.['5'] ?? '').trim(),
      },
    })),
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────
export async function createPlatformSkill(formData: FormData) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const payload = parsePayload(formData)
  const v = skillSchema.safeParse(payload)
  if (!v.success) return { success: false, error: v.error.errors[0].message }

  const { data: skill, error } = await service
    .from('skills')
    .insert({
      org_id: null,
      source: 'platform',
      name: v.data.name,
      icon: v.data.icon,
      description: v.data.description,
      dimensions: v.data.dimensions,
      is_archived: false,
      created_by: actor!.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await audit(service, 'create_platform_skill', skill.id, actor!.id, { name: v.data.name })
  revalidatePath('/admin-skills')
  return { success: true, skill }
}

export async function updatePlatformSkill(skillId: string, formData: FormData) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const { data: existing } = await service
    .from('skills')
    .select('source')
    .eq('id', skillId)
    .single()
  if (!existing) return { success: false, error: 'Skill not found' }
  if (existing.source !== 'platform') {
    return { success: false, error: 'Only platform skills can be edited from this page' }
  }

  const payload = parsePayload(formData)
  const v = skillSchema.safeParse(payload)
  if (!v.success) return { success: false, error: v.error.errors[0].message }

  const { error } = await service
    .from('skills')
    .update({
      name: v.data.name,
      icon: v.data.icon,
      description: v.data.description,
      dimensions: v.data.dimensions,
    })
    .eq('id', skillId)
  if (error) return { success: false, error: error.message }

  await audit(service, 'update_platform_skill', skillId, actor!.id, { name: v.data.name })
  revalidatePath('/admin-skills')
  return { success: true }
}

export async function archivePlatformSkill(skillId: string, archived: boolean) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const { error } = await service
    .from('skills')
    .update({ is_archived: archived })
    .eq('id', skillId)
    .eq('source', 'platform')
  if (error) return { success: false, error: error.message }

  await audit(
    service,
    archived ? 'archive_platform_skill' : 'unarchive_platform_skill',
    skillId,
    actor!.id,
  )
  revalidatePath('/admin-skills')
  return { success: true }
}

export async function duplicatePlatformSkill(skillId: string) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const { data: src } = await service.from('skills').select('*').eq('id', skillId).single()
  if (!src || src.source !== 'platform') {
    return { success: false, error: 'Source skill not found' }
  }

  // Re-id dimensions so cross-references stay clean
  const reIdDims = Array.isArray(src.dimensions)
    ? (src.dimensions as any[]).map((d) => ({ ...d, id: randomUUID() }))
    : []

  const { data: copy, error } = await service
    .from('skills')
    .insert({
      org_id: null,
      source: 'platform',
      name: `${src.name} (copy)`,
      icon: src.icon,
      description: src.description,
      dimensions: reIdDims,
      is_archived: false,
      created_by: actor!.id,
    })
    .select()
    .single()
  if (error) return { success: false, error: error.message }

  await audit(service, 'duplicate_platform_skill', copy.id, actor!.id, { source_id: skillId })
  revalidatePath('/admin-skills')
  return { success: true, skill: copy }
}
