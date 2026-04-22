/**
 * scripts/create-demo-users.ts
 * Creates demo users via Supabase Auth Admin API
 * 
 * Run with: npx tsx scripts/create-demo-users.ts
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Demo org ID from seed.sql
const ACME_ORG_ID = '00000000-0000-0000-0000-000000000001'

// Skill IDs from seed.sql
const SKILL_IDS = {
  executivePresence: '10000000-0000-0000-0000-000000000001',
  givingFeedback: '10000000-0000-0000-0000-000000000002',
  negotiation: '10000000-0000-0000-0000-000000000003',
  delegation: '10000000-0000-0000-0000-000000000004',
  storytelling: '10000000-0000-0000-0000-000000000005',
  activeListening: '10000000-0000-0000-0000-000000000006',
}

// Avatar options
const EMOJIS = ['🦊', '🐼', '🦁', '🐨', '🐯', '🐸', '🦉', '🐧']
const COLORS = ['#623CEA', '#23CE68', '#F68A29', '#FFCE00', '#FF6B6B', '#4ECDC4']

// User definitions
interface DemoUser {
  email: string
  password: string
  name: string
  role: 'super_admin' | 'hr' | 'participant'
  orgId?: string
  title?: string
  func?: string
  emoji: string
  color: string
  skills?: { skillId: string; phase: 'pre' | 'training' | 'post' }[]
}

const demoUsers: DemoUser[] = [
  // Super Admin
  {
    email: 'superadmin@nudgeable.ai',
    password: 'Admin1234!',
    name: 'System Admin',
    role: 'super_admin',
    emoji: '👑',
    color: '#FFCE00',
  },
  // HR at Acme
  {
    email: 'hr@acme.test',
    password: 'HR1234!',
    name: 'Jordan Rivera',
    role: 'hr',
    orgId: ACME_ORG_ID,
    title: 'People Development Lead',
    func: 'HR',
    emoji: '🎯',
    color: '#623CEA',
  },
  // 5 Participants at Acme
  {
    email: 'p1@acme.test',
    password: 'Pass1234!',
    name: 'Alex Chen',
    role: 'participant',
    orgId: ACME_ORG_ID,
    title: 'Senior Engineer',
    func: 'Engineering',
    emoji: '🦊',
    color: '#23CE68',
    skills: [
      { skillId: SKILL_IDS.executivePresence, phase: 'pre' },
      { skillId: SKILL_IDS.givingFeedback, phase: 'training' },
    ],
  },
  {
    email: 'p2@acme.test',
    password: 'Pass1234!',
    name: 'Sam Taylor',
    role: 'participant',
    orgId: ACME_ORG_ID,
    title: 'Product Manager',
    func: 'Product',
    emoji: '🐼',
    color: '#F68A29',
    skills: [
      { skillId: SKILL_IDS.negotiation, phase: 'training' },
    ],
  },
  {
    email: 'p3@acme.test',
    password: 'Pass1234!',
    name: 'Casey Morgan',
    role: 'participant',
    orgId: ACME_ORG_ID,
    title: 'Design Lead',
    func: 'Design',
    emoji: '🦁',
    color: '#4ECDC4',
    skills: [
      { skillId: SKILL_IDS.storytelling, phase: 'post' },
      { skillId: SKILL_IDS.activeListening, phase: 'pre' },
    ],
  },
  {
    email: 'p4@acme.test',
    password: 'Pass1234!',
    name: 'Riley Kim',
    role: 'participant',
    orgId: ACME_ORG_ID,
    title: 'Sales Director',
    func: 'Sales',
    emoji: '🐯',
    color: '#FF6B6B',
    skills: [
      { skillId: SKILL_IDS.delegation, phase: 'training' },
    ],
  },
  {
    email: 'p5@acme.test',
    password: 'Pass1234!',
    name: 'Drew Martinez',
    role: 'participant',
    orgId: ACME_ORG_ID,
    title: 'Marketing Manager',
    func: 'Marketing',
    emoji: '🐸',
    color: '#623CEA',
    skills: [
      { skillId: SKILL_IDS.executivePresence, phase: 'pre' },
    ],
  },
]

async function createUser(user: DemoUser): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    })

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered')) {
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existing = existingUsers?.users.find(u => u.email === user.email)
        if (existing) {
          console.log(`  ⚠️  User ${user.email} already exists, updating profile...`)
          return { success: true, userId: existing.id }
        }
      }
      throw authError
    }

    const userId = authData.user.id

    // 2. Insert user profile
    const { error: profileError } = await supabase.from('users').upsert({
      id: userId,
      org_id: user.orgId || null,
      role: user.role,
      email: user.email,
      name: user.name,
      plain_password: user.password,
      must_change_pw: true,
      title: user.title || null,
      func: user.func || null,
      avatar_emoji: user.emoji,
      avatar_color: user.color,
      status: 'active',
    }, { onConflict: 'id' })

    if (profileError) throw profileError

    // 3. Create user_skills if participant
    if (user.skills && user.skills.length > 0) {
      for (const skill of user.skills) {
        const { error: skillError } = await supabase.from('user_skills').upsert({
          user_id: userId,
          skill_id: skill.skillId,
          org_id: user.orgId!,
          phase: skill.phase,
          is_active: true,
        }, { onConflict: 'user_id,skill_id' })

        if (skillError) {
          console.log(`  ⚠️  Could not assign skill: ${skillError.message}`)
        }
      }
    }

    return { success: true, userId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Nudgeable — Creating Demo Users')
  console.log('===================================\n')

  const results: Array<{ email: string; role: string; status: string; userId?: string }> = []

  for (const user of demoUsers) {
    process.stdout.write(`Creating ${user.role}: ${user.email}... `)
    const result = await createUser(user)

    if (result.success) {
      console.log('✅')
      results.push({ email: user.email, role: user.role, status: 'Created', userId: result.userId })
    } else {
      console.log(`❌ ${result.error}`)
      results.push({ email: user.email, role: user.role, status: `Failed: ${result.error}` })
    }
  }

  // Print summary table
  console.log('\n📋 Summary')
  console.log('─'.repeat(80))
  console.log(
    'Email'.padEnd(30) +
    'Role'.padEnd(15) +
    'Status'.padEnd(20) +
    'Password'
  )
  console.log('─'.repeat(80))

  for (const user of demoUsers) {
    const result = results.find(r => r.email === user.email)
    console.log(
      user.email.padEnd(30) +
      user.role.padEnd(15) +
      (result?.status.startsWith('Created') ? '✅ Created' : '❌ Failed').padEnd(20) +
      user.password
    )
  }

  console.log('─'.repeat(80))
  console.log('\n🔑 Login at: http://localhost:3000/login')
  console.log('   Super Admin: superadmin@nudgeable.ai / Admin1234!')
  console.log('   HR:          hr@acme.test / HR1234!')
  console.log('   Participant: p1@acme.test / Pass1234!')
}

main().catch(console.error)
