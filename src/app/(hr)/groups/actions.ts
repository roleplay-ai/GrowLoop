'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
})

async function verifyHR(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', user: null, orgId: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr') {
    return { error: 'Unauthorized: HR access required', user: null, orgId: null }
  }

  return { error: null, user, orgId: profile.org_id }
}

async function insertAuditLog(
  supabase: any,
  action: string,
  targetType: string,
  targetId: string,
  actorId: string,
  details: Record<string, any> = {}
) {
  await supabase.from('audit_log').insert({
    action,
    target_type: targetType,
    target_id: targetId,
    actor_id: actorId,
    details,
  })
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const validation = createGroupSchema.safeParse({
    name: formData.get('name'),
    description: (formData.get('description') as string) || null,
  })

  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { data: group, error } = await serviceClient
    .from('groups')
    .insert({
      org_id: orgId,
      name: validation.data.name,
      description: validation.data.description,
      default_skills: [],
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await insertAuditLog(serviceClient, 'create_group', 'group', group.id, actor!.id, {
    name: validation.data.name,
  })

  revalidatePath('/groups')
  return { success: true, group }
}

export async function updateGroup(groupId: string, formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: group } = await serviceClient
    .from('groups')
    .select('org_id')
    .eq('id', groupId)
    .single()

  if (!group || group.org_id !== orgId) {
    return { success: false, error: 'Group not found in your organization' }
  }

  const validation = createGroupSchema.safeParse({
    name: formData.get('name'),
    description: (formData.get('description') as string) || null,
  })

  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { error } = await serviceClient
    .from('groups')
    .update(validation.data)
    .eq('id', groupId)

  if (error) return { success: false, error: error.message }

  await insertAuditLog(serviceClient, 'update_group', 'group', groupId, actor!.id, validation.data)

  revalidatePath('/groups')
  return { success: true }
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: group } = await serviceClient
    .from('groups')
    .select('org_id, name')
    .eq('id', groupId)
    .single()

  if (!group || group.org_id !== orgId) {
    return { success: false, error: 'Group not found in your organization' }
  }

  // Cascade: remove group_members entries (should be auto-deleted by FK cascade)
  await serviceClient.from('group_members').delete().eq('group_id', groupId)

  const { error } = await serviceClient.from('groups').delete().eq('id', groupId)

  if (error) return { success: false, error: error.message }

  await insertAuditLog(serviceClient, 'delete_group', 'group', groupId, actor!.id, {
    name: group.name,
  })

  revalidatePath('/groups')
  return { success: true }
}

export async function addParticipantToGroup(groupId: string, userId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  // Verify both group and user belong to the HR's org
  const [{ data: group }, { data: targetUser }] = await Promise.all([
    serviceClient.from('groups').select('org_id').eq('id', groupId).single(),
    serviceClient.from('users').select('org_id, role').eq('id', userId).single(),
  ])

  if (!group || group.org_id !== orgId) {
    return { success: false, error: 'Group not found' }
  }

  if (!targetUser || targetUser.org_id !== orgId || targetUser.role !== 'participant') {
    return { success: false, error: 'Participant not found' }
  }

  const { error } = await serviceClient
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId })

  if (error && !error.message.includes('duplicate')) {
    return { success: false, error: error.message }
  }

  await insertAuditLog(serviceClient, 'add_to_group', 'group', groupId, actor!.id, {
    user_id: userId,
  })

  revalidatePath('/groups')
  return { success: true }
}

export async function removeParticipantFromGroup(groupId: string, userId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: group } = await serviceClient
    .from('groups')
    .select('org_id')
    .eq('id', groupId)
    .single()

  if (!group || group.org_id !== orgId) {
    return { success: false, error: 'Group not found' }
  }

  const { error } = await serviceClient
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }

  await insertAuditLog(serviceClient, 'remove_from_group', 'group', groupId, actor!.id, {
    user_id: userId,
  })

  revalidatePath('/groups')
  return { success: true }
}
