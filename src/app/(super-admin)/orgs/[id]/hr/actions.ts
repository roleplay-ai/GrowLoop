'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const passwordSchema = z.string().min(1, 'Password is required')

const createHRSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  orgId: z.string().uuid('Invalid organization ID'),
})

const resetPasswordSchema = z.object({
  password: passwordSchema,
})

const AVATAR_COLORS = ['#623CEA', '#FFCE00', '#23CE68', '#F68A29', '#ED4551', '#3B82F6', '#8B5CF6']

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

async function verifySuperAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', user: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return { error: 'Unauthorized: Super Admin access required', user: null }
  }

  return { error: null, user }
}

export async function createHR(formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    orgId: formData.get('orgId') as string,
  }

  const validation = createHRSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { name, email, password, orgId } = validation.data
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  // Check if email already exists
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return { success: false, error: 'A user with this email already exists' }
  }

  // Create auth user using admin API
  const { data: authData, error: authCreateError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authCreateError || !authData.user) {
    return { success: false, error: authCreateError?.message ?? 'Failed to create auth user' }
  }

  // Create profile in users table
  const { error: profileError } = await serviceClient
    .from('users')
    .insert({
      id: authData.user.id,
      org_id: orgId,
      name,
      email,
      role: 'hr',
      status: 'active',
      plain_password: password,
      must_change_pw: true,
      avatar_color: avatarColor,
    })

  if (profileError) {
    // Rollback: delete auth user
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: profileError.message }
  }

  await insertAuditLog(serviceClient, 'create_hr', 'user', authData.user.id, actor!.id, { 
    email, 
    name, 
    org_id: orgId 
  })

  revalidatePath(`/orgs/${orgId}/hr`)
  return { 
    success: true, 
    credentials: { email, password },
    userId: authData.user.id
  }
}

export async function resetHRPassword(userId: string, orgId: string, newPassword: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const validation = resetPasswordSchema.safeParse({ password: newPassword })
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  // Update auth password
  const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (authUpdateError) {
    return { success: false, error: authUpdateError.message }
  }

  // Update plain_password and force change
  const { data: user, error: profileError } = await serviceClient
    .from('users')
    .update({ 
      plain_password: newPassword, 
      must_change_pw: true 
    })
    .eq('id', userId)
    .select('email')
    .single()

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  await insertAuditLog(serviceClient, 'reset_password', 'user', userId, actor!.id, {})

  revalidatePath(`/orgs/${orgId}/hr`)
  return { 
    success: true, 
    credentials: { email: user.email, password: newPassword }
  }
}

export async function deactivateHR(userId: string, orgId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const { error } = await serviceClient
    .from('users')
    .update({ status: 'inactive' })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  await insertAuditLog(serviceClient, 'deactivate_hr', 'user', userId, actor!.id, {})

  revalidatePath(`/orgs/${orgId}/hr`)
  return { success: true }
}

export async function reactivateHR(userId: string, orgId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  
  const { error: authError, user: actor } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const { error } = await serviceClient
    .from('users')
    .update({ status: 'active' })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  await insertAuditLog(serviceClient, 'reactivate_hr', 'user', userId, actor!.id, {})

  revalidatePath(`/orgs/${orgId}/hr`)
  return { success: true }
}
