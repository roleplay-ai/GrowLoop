'use server'
// src/app/(hr)/hr-skills/actions.ts
//
// HR-side skills management:
//   * Enable / disable a platform skill for the org (toggles the org_skills row)
//   * Clone a platform skill into a fully editable org_custom skill
//   * Edit / archive an org_custom skill
//
// HR cannot touch other orgs' or platform-level rows.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const dimensionSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(60),
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
  name: z.string().min(2).max(60),
  icon: z.string().max(8).optional().default('🧠'),
  description: z.string().max(1000).optional().default(''),
  dimensions: z.array(dimensionSchema).max(6).default([]),
})

async function verifyHR(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', user: null, orgId: null as any }
  const { data: profile } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'hr') {
    return { error: 'Unauthorized: HR access required', user: null, orgId: null as any }
  }
  return { error: null, user, orgId: profile.org_id }
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

function parsePayload(formData: FormData) {
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
    icon: String(formData.get('icon') ?? '').trim() || '🧠',
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

// ── Enable / disable a platform skill for the org ───────────────────────────
export async function setPlatformSkillEnabled(skillId: string, enabled: boolean) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  // Verify skill is a platform skill
  const { data: skill } = await service
    .from('skills')
    .select('source')
    .eq('id', skillId)
    .single()
  if (!skill || skill.source !== 'platform') {
    return { success: false, error: 'Skill not found' }
  }

  const { error } = await service.from('org_skills').upsert(
    { org_id: orgId, skill_id: skillId, enabled },
    { onConflict: 'org_id,skill_id' },
  )
  if (error) return { success: false, error: error.message }

  await audit(
    service,
    enabled ? 'enable_skill_for_org' : 'disable_skill_for_org',
    skillId,
    actor!.id,
    { org_id: orgId },
  )
  revalidatePath('/hr-skills')
  return { success: true }
}

// ── Clone a platform skill into the org's catalogue ─────────────────────────
export async function cloneSkillToOrg(platformSkillId: string) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: src } = await service
    .from('skills')
    .select('*')
    .eq('id', platformSkillId)
    .single()
  if (!src || src.source !== 'platform') {
    return { success: false, error: 'Source skill not found' }
  }

  const reIdDims = Array.isArray(src.dimensions)
    ? (src.dimensions as any[]).map((d) => ({ ...d, id: randomUUID() }))
    : []

  const { data: copy, error } = await service
    .from('skills')
    .insert({
      org_id: orgId,
      source: 'org_custom',
      name: src.name,
      icon: src.icon,
      description: src.description,
      dimensions: reIdDims,
      is_archived: false,
      created_by: actor!.id,
    })
    .select()
    .single()
  if (error) return { success: false, error: error.message }

  await audit(service, 'clone_platform_skill', copy.id, actor!.id, {
    source_id: platformSkillId,
    org_id: orgId,
  })
  revalidatePath('/hr-skills')
  return { success: true, skill: copy }
}

// ── Update an org_custom skill ──────────────────────────────────────────────
export async function updateOrgSkill(skillId: string, formData: FormData) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: existing } = await service
    .from('skills')
    .select('source, org_id')
    .eq('id', skillId)
    .single()
  if (!existing || existing.source !== 'org_custom' || existing.org_id !== orgId) {
    return { success: false, error: 'Skill not found in your org' }
  }

  const v = skillSchema.safeParse(parsePayload(formData))
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

  await audit(service, 'update_org_skill', skillId, actor!.id, { name: v.data.name })
  revalidatePath('/hr-skills')
  return { success: true }
}

// ── Create a brand-new org_custom skill (from scratch) ──────────────────────
export async function createOrgSkill(formData: FormData) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const v = skillSchema.safeParse(parsePayload(formData))
  if (!v.success) return { success: false, error: v.error.errors[0].message }

  const { data: skill, error } = await service
    .from('skills')
    .insert({
      org_id: orgId,
      source: 'org_custom',
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

  await audit(service, 'create_org_skill', skill.id, actor!.id, { name: v.data.name })
  revalidatePath('/hr-skills')
  return { success: true, skill }
}

// ── Archive / unarchive an org_custom skill ─────────────────────────────────
export async function archiveOrgSkill(skillId: string, archived: boolean) {
  const supabase = await createClient()
  const service = await createServiceClient()
  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: existing } = await service
    .from('skills')
    .select('source, org_id')
    .eq('id', skillId)
    .single()
  if (!existing || existing.source !== 'org_custom' || existing.org_id !== orgId) {
    return { success: false, error: 'Skill not found in your org' }
  }

  const { error } = await service
    .from('skills')
    .update({ is_archived: archived })
    .eq('id', skillId)
  if (error) return { success: false, error: error.message }

  await audit(
    service,
    archived ? 'archive_org_skill' : 'unarchive_org_skill',
    skillId,
    actor!.id,
  )
  revalidatePath('/hr-skills')
  return { success: true }
}
