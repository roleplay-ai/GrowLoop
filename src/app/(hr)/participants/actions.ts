'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const passwordSchema = z.string().min(1, 'Password is required')

const createParticipantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  title: z.string().optional().nullable(),
  func: z.string().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
})

const updateParticipantSchema = z.object({
  name: z.string().min(2).optional(),
  title: z.string().optional().nullable(),
  func: z.string().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
})

const AVATAR_COLORS = ['#623CEA', '#FFCE00', '#23CE68', '#F68A29', '#ED4551', '#3B82F6', '#8B5CF6']

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
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

async function checkSeatLimit(serviceClient: any, orgId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: org } = await serviceClient
    .from('organizations')
    .select('seat_limit')
    .eq('id', orgId)
    .single()

  if (!org) return { ok: false, error: 'Organization not found' }

  const { count } = await serviceClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('role', 'participant')
    .neq('status', 'inactive')

  if ((count ?? 0) >= org.seat_limit) {
    return { ok: false, error: `Seat limit reached (${org.seat_limit}). Upgrade plan to add more participants.` }
  }

  return { ok: true }
}

export async function createParticipant(formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    title: (formData.get('title') as string) || null,
    func: (formData.get('func') as string) || null,
    group_id: (formData.get('group_id') as string) || null,
  }

  const validation = createParticipantSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { name, email, password, title, func, group_id } = validation.data

  // Seat limit check
  const seatCheck = await checkSeatLimit(serviceClient, orgId!)
  if (!seatCheck.ok) return { success: false, error: seatCheck.error }

  // Check email unique
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    return { success: false, error: 'A user with this email already exists' }
  }

  // Create auth user
  const { data: authData, error: authCreateError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authCreateError || !authData.user) {
    return { success: false, error: authCreateError?.message ?? 'Failed to create auth user' }
  }

  // Create profile
  const { error: profileError } = await serviceClient
    .from('users')
    .insert({
      id: authData.user.id,
      org_id: orgId,
      name,
      email,
      role: 'participant',
      status: 'active',
      plain_password: password,
      must_change_pw: true,
      avatar_color: randomAvatarColor(),
      title,
      func,
    })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: profileError.message }
  }

  // Add to group via junction table
  if (group_id) {
    await serviceClient.from('group_members').insert({
      group_id,
      user_id: authData.user.id,
    })
  }

  await insertAuditLog(serviceClient, 'create_participant', 'user', authData.user.id, actor!.id, {
    email, name, org_id: orgId, group_id,
  })

  revalidatePath('/participants')
  return {
    success: true,
    credentials: { email, password },
    userId: authData.user.id,
  }
}

interface BulkRow {
  name: string
  email: string
  password: string
  title?: string
  func?: string
  group_name?: string
}

export async function bulkCreateParticipants(rows: BulkRow[]) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError, created: 0, failed: 0, errors: [], credentials: [] }

  const seatCheck = await checkSeatLimit(serviceClient, orgId!)
  if (!seatCheck.ok) {
    return { success: false, error: seatCheck.error, created: 0, failed: 0, errors: [], credentials: [] }
  }

  const created: Array<{ email: string; password: string; name: string }> = []
  const errors: Array<{ row: number; email: string; error: string }> = []

  // Load groups for mapping group_name → group_id
  const { data: groups } = await serviceClient
    .from('groups')
    .select('id, name')
    .eq('org_id', orgId)

  const groupMap = new Map((groups ?? []).map((g: any) => [g.name.toLowerCase(), g.id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // accounting for header row

    try {
      const validation = createParticipantSchema.safeParse({
        name: row.name,
        email: row.email,
        password: row.password,
        title: row.title || null,
        func: row.func || null,
        group_id: row.group_name ? groupMap.get(row.group_name.toLowerCase()) ?? null : null,
      })

      if (!validation.success) {
        errors.push({ row: rowNum, email: row.email, error: validation.error.errors[0].message })
        continue
      }

      const { data: existingUser } = await serviceClient
        .from('users')
        .select('id')
        .eq('email', validation.data.email)
        .maybeSingle()

      if (existingUser) {
        errors.push({ row: rowNum, email: row.email, error: 'Email already exists' })
        continue
      }

      const { data: authData, error: authCreateError } = await serviceClient.auth.admin.createUser({
        email: validation.data.email,
        password: validation.data.password,
        email_confirm: true,
      })

      if (authCreateError || !authData.user) {
        errors.push({ row: rowNum, email: row.email, error: authCreateError?.message ?? 'Auth creation failed' })
        continue
      }

      const { error: profileError } = await serviceClient
        .from('users')
        .insert({
          id: authData.user.id,
          org_id: orgId,
          name: validation.data.name,
          email: validation.data.email,
          role: 'participant',
          status: 'active',
          plain_password: validation.data.password,
          must_change_pw: true,
          avatar_color: randomAvatarColor(),
          title: validation.data.title,
          func: validation.data.func,
        })

      if (profileError) {
        await serviceClient.auth.admin.deleteUser(authData.user.id)
        errors.push({ row: rowNum, email: row.email, error: profileError.message })
        continue
      }

      if (validation.data.group_id) {
        await serviceClient.from('group_members').insert({
          group_id: validation.data.group_id,
          user_id: authData.user.id,
        })
      }

      created.push({ email: validation.data.email, password: validation.data.password, name: validation.data.name })

      await insertAuditLog(serviceClient, 'create_participant', 'user', authData.user.id, actor!.id, {
        email: validation.data.email, name: validation.data.name, source: 'bulk_import',
      })
    } catch (err: any) {
      errors.push({ row: rowNum, email: row.email, error: err?.message ?? 'Unknown error' })
    }
  }

  revalidatePath('/participants')
  return {
    success: true,
    created: created.length,
    failed: errors.length,
    errors,
    credentials: created,
  }
}

export async function updateParticipant(userId: string, formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  // Verify participant belongs to HR's org
  const { data: target } = await serviceClient
    .from('users')
    .select('org_id, role')
    .eq('id', userId)
    .single()

  if (!target || target.org_id !== orgId || target.role !== 'participant') {
    return { success: false, error: 'Participant not found in your organization' }
  }

  const rawData: Record<string, any> = {}
  const name = formData.get('name')
  const title = formData.get('title')
  const func = formData.get('func')
  const groupIdRaw = formData.get('group_id')

  if (name) rawData.name = name as string
  if (title !== null) rawData.title = (title as string) || null
  if (func !== null) rawData.func = (func as string) || null

  const validation = updateParticipantSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { error } = await serviceClient
    .from('users')
    .update(validation.data)
    .eq('id', userId)

  if (error) return { success: false, error: error.message }

  // Handle group membership changes
  if (groupIdRaw !== null) {
    const newGroupId = (groupIdRaw as string) || null

    // Remove existing group memberships for this user (within org groups)
    const { data: orgGroups } = await serviceClient
      .from('groups')
      .select('id')
      .eq('org_id', orgId)

    const orgGroupIds = (orgGroups ?? []).map((g: any) => g.id)
    if (orgGroupIds.length > 0) {
      await serviceClient
        .from('group_members')
        .delete()
        .eq('user_id', userId)
        .in('group_id', orgGroupIds)
    }

    if (newGroupId) {
      await serviceClient.from('group_members').insert({
        group_id: newGroupId,
        user_id: userId,
      })
    }
  }

  await insertAuditLog(serviceClient, 'update_participant', 'user', userId, actor!.id, {
    ...validation.data,
    group_id: groupIdRaw,
  })

  revalidatePath('/participants')
  return { success: true }
}

export async function deactivateParticipant(userId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: target } = await serviceClient
    .from('users')
    .select('org_id, role')
    .eq('id', userId)
    .single()

  if (!target || target.org_id !== orgId || target.role !== 'participant') {
    return { success: false, error: 'Participant not found in your organization' }
  }

  const { error } = await serviceClient
    .from('users')
    .update({ status: 'inactive' })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }

  // Deactivate all user_skills
  await serviceClient
    .from('user_skills')
    .update({ is_active: false })
    .eq('user_id', userId)

  await insertAuditLog(serviceClient, 'deactivate_participant', 'user', userId, actor!.id, {})

  revalidatePath('/participants')
  return { success: true }
}

export async function reactivateParticipant(userId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const { data: target } = await serviceClient
    .from('users')
    .select('org_id, role')
    .eq('id', userId)
    .single()

  if (!target || target.org_id !== orgId || target.role !== 'participant') {
    return { success: false, error: 'Participant not found in your organization' }
  }

  const { error } = await serviceClient
    .from('users')
    .update({ status: 'active' })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }

  await insertAuditLog(serviceClient, 'reactivate_participant', 'user', userId, actor!.id, {})

  revalidatePath('/participants')
  return { success: true }
}

export async function resetParticipantPassword(userId: string, newPassword: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { error: authError, user: actor, orgId } = await verifyHR(supabase)
  if (authError) return { success: false, error: authError }

  const validation = passwordSchema.safeParse(newPassword)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { data: target } = await serviceClient
    .from('users')
    .select('org_id, role, email')
    .eq('id', userId)
    .single()

  if (!target || target.org_id !== orgId || target.role !== 'participant') {
    return { success: false, error: 'Participant not found in your organization' }
  }

  const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (authUpdateError) return { success: false, error: authUpdateError.message }

  const { error: profileError } = await serviceClient
    .from('users')
    .update({ plain_password: newPassword, must_change_pw: true })
    .eq('id', userId)

  if (profileError) return { success: false, error: profileError.message }

  await insertAuditLog(serviceClient, 'reset_password', 'user', userId, actor!.id, {})

  revalidatePath('/participants')
  return {
    success: true,
    credentials: { email: target.email, password: newPassword },
  }
}
