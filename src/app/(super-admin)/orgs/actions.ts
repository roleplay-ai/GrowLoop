'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  plan: z.enum(['starter', 'growth', 'enterprise']),
  seat_limit: z.number().min(1, 'Seat limit must be at least 1').max(10000),
})

const updateOrgSchema = createOrgSchema.partial()

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

export async function createOrg(formData: FormData) {
  const supabase = await createClient()
  
  const { error: authError, user } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const rawData = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    plan: formData.get('plan') as string,
    seat_limit: parseInt(formData.get('seat_limit') as string, 10),
  }

  const validation = createOrgSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const { name, slug, plan, seat_limit } = validation.data

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return { success: false, error: 'Organization slug already exists' }
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      plan,
      seat_limit,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await insertAuditLog(supabase, 'create_org', 'organization', org.id, user!.id, { name, slug, plan, seat_limit })

  revalidatePath('/orgs')
  return { success: true, orgId: org.id }
}

export async function updateOrg(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const { error: authError, user } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  const rawData: Record<string, any> = {}
  const name = formData.get('name')
  const slug = formData.get('slug')
  const plan = formData.get('plan')
  const seat_limit = formData.get('seat_limit')

  if (name) rawData.name = name as string
  if (slug) rawData.slug = slug as string
  if (plan) rawData.plan = plan as string
  if (seat_limit) rawData.seat_limit = parseInt(seat_limit as string, 10)

  const validation = updateOrgSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  // Check slug uniqueness if changing
  if (validation.data.slug) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', validation.data.slug)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'Organization slug already exists' }
    }
  }

  const { error } = await supabase
    .from('organizations')
    .update(validation.data)
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  await insertAuditLog(supabase, 'update_org', 'organization', id, user!.id, validation.data)

  revalidatePath('/orgs')
  revalidatePath(`/orgs/${id}`)
  return { success: true }
}

export async function suspendOrg(id: string) {
  const supabase = await createClient()
  
  const { error: authError, user } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  // Suspend org
  const { error: orgError } = await supabase
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('id', id)

  if (orgError) {
    return { success: false, error: orgError.message }
  }

  // Suspend all users in org
  const { error: usersError } = await supabase
    .from('users')
    .update({ status: 'suspended' })
    .eq('org_id', id)

  if (usersError) {
    console.error('Failed to suspend users:', usersError)
  }

  await insertAuditLog(supabase, 'suspend_org', 'organization', id, user!.id, {})

  revalidatePath('/orgs')
  return { success: true }
}

export async function reactivateOrg(id: string) {
  const supabase = await createClient()
  
  const { error: authError, user } = await verifySuperAdmin(supabase)
  if (authError) return { success: false, error: authError }

  // Reactivate org
  const { error: orgError } = await supabase
    .from('organizations')
    .update({ status: 'active' })
    .eq('id', id)

  if (orgError) {
    return { success: false, error: orgError.message }
  }

  // Reactivate all users in org (except those individually deactivated before suspension)
  const { error: usersError } = await supabase
    .from('users')
    .update({ status: 'active' })
    .eq('org_id', id)
    .eq('status', 'suspended')

  if (usersError) {
    console.error('Failed to reactivate users:', usersError)
  }

  await insertAuditLog(supabase, 'reactivate_org', 'organization', id, user!.id, {})

  revalidatePath('/orgs')
  return { success: true }
}
