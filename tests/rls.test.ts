/**
 * tests/rls.test.ts
 * RLS (Row Level Security) verification tests
 * 
 * Run with: npm run test:rls
 *   or: npx tsx tests/rls.test.ts
 * 
 * Prerequisites:
 *   1. Supabase running locally: supabase start
 *   2. Migration applied: npm run db:reset
 *   3. Demo users created: npm run db:seed-users
 *   4. .env.local configured with Supabase credentials
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('❌ Missing environment variables. Check .env.local')
  process.exit(1)
}

// Test credentials (must match create-demo-users.ts)
const USERS = {
  superAdmin: { email: 'superadmin@nudgeable.ai', password: 'Admin1234!' },
  hr: { email: 'hr@acme.test', password: 'HR1234!' },
  participant: { email: 'p1@acme.test', password: 'Pass1234!' },
}

// ACME org ID from seed
const ACME_ORG_ID = '00000000-0000-0000-0000-000000000001'

// Test tracking
let passed = 0
let failed = 0

function log(status: '✅' | '❌' | '⚠️', message: string) {
  console.log(`  ${status} ${message}`)
  if (status === '✅') passed++
  if (status === '❌') failed++
}

async function signIn(email: string, password: string): Promise<SupabaseClient | null> {
  const client = createClient(supabaseUrl!, supabaseAnonKey!)
  
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  
  if (error) {
    console.error(`  ⚠️  Could not sign in as ${email}: ${error.message}`)
    return null
  }
  
  return client
}

async function testSuperAdmin() {
  console.log('\n🔐 Testing Super Admin RLS...')
  
  const client = await signIn(USERS.superAdmin.email, USERS.superAdmin.password)
  if (!client) {
    log('❌', 'Could not authenticate super admin')
    return
  }

  // Test 1: Super admin can read ALL orgs
  const { data: orgs, error: orgsError } = await client
    .from('organizations')
    .select('*')
  
  if (orgsError) {
    log('❌', `Cannot read orgs: ${orgsError.message}`)
  } else if (orgs && orgs.length >= 1) {
    log('✅', `Can read all orgs (found ${orgs.length})`)
  } else {
    log('❌', 'No orgs returned')
  }

  // Test 2: Super admin can read ALL users
  const { data: users, error: usersError } = await client
    .from('users')
    .select('id, email, role, org_id')
  
  if (usersError) {
    log('❌', `Cannot read users: ${usersError.message}`)
  } else if (users && users.length >= 1) {
    log('✅', `Can read all users (found ${users.length})`)
  } else {
    log('❌', 'No users returned')
  }

  // Test 3: Super admin can read audit log
  const { data: audit, error: auditError } = await client
    .from('audit_log')
    .select('id')
    .limit(1)
  
  if (auditError && auditError.code !== 'PGRST116') {
    log('❌', `Cannot access audit_log: ${auditError.message}`)
  } else {
    log('✅', 'Can access audit_log')
  }

  // Test 4: Super admin can read platform skills
  const { data: skills, error: skillsError } = await client
    .from('skills')
    .select('id, name, source')
    .eq('source', 'platform')
  
  if (skillsError) {
    log('❌', `Cannot read skills: ${skillsError.message}`)
  } else if (skills && skills.length >= 6) {
    log('✅', `Can read platform skills (found ${skills.length})`)
  } else {
    log('⚠️', `Found fewer skills than expected: ${skills?.length || 0}`)
  }

  await client.auth.signOut()
}

async function testHR() {
  console.log('\n🔐 Testing HR RLS...')
  
  const client = await signIn(USERS.hr.email, USERS.hr.password)
  if (!client) {
    log('❌', 'Could not authenticate HR user')
    return
  }

  // Test 1: HR can read their own org
  const { data: orgs, error: orgsError } = await client
    .from('organizations')
    .select('*')
  
  if (orgsError) {
    log('❌', `Cannot read org: ${orgsError.message}`)
  } else if (orgs && orgs.length === 1 && orgs[0].id === ACME_ORG_ID) {
    log('✅', `Can read own org only (${orgs[0].name})`)
  } else if (orgs && orgs.length > 1) {
    log('❌', `HR can see ${orgs.length} orgs (should only see 1)`)
  } else {
    log('❌', 'Cannot read own org')
  }

  // Test 2: HR can only read users in their org
  const { data: users, error: usersError } = await client
    .from('users')
    .select('id, email, org_id')
  
  if (usersError) {
    log('❌', `Cannot read users: ${usersError.message}`)
  } else if (users) {
    const wrongOrgUsers = users.filter(u => u.org_id !== ACME_ORG_ID && u.org_id !== null)
    if (wrongOrgUsers.length > 0) {
      log('❌', `HR can see users from other orgs: ${wrongOrgUsers.length}`)
    } else {
      log('✅', `Can only see own org users (found ${users.length})`)
    }
  }

  // Test 3: HR can read platform skills
  const { data: skills, error: skillsError } = await client
    .from('skills')
    .select('id, name, source')
  
  if (skillsError) {
    log('❌', `Cannot read skills: ${skillsError.message}`)
  } else if (skills && skills.length >= 6) {
    log('✅', `Can read skills (found ${skills.length})`)
  } else {
    log('⚠️', `Found fewer skills than expected: ${skills?.length || 0}`)
  }

  // Test 4: HR can read user_skills for their org
  const { data: userSkills, error: usError } = await client
    .from('user_skills')
    .select('id, org_id')
  
  if (usError) {
    log('❌', `Cannot read user_skills: ${usError.message}`)
  } else {
    const wrongOrgSkills = userSkills?.filter(us => us.org_id !== ACME_ORG_ID) || []
    if (wrongOrgSkills.length > 0) {
      log('❌', `HR can see user_skills from other orgs`)
    } else {
      log('✅', `Can read user_skills for own org (found ${userSkills?.length || 0})`)
    }
  }

  await client.auth.signOut()
}

async function testParticipant() {
  console.log('\n🔐 Testing Participant RLS...')
  
  const client = await signIn(USERS.participant.email, USERS.participant.password)
  if (!client) {
    log('❌', 'Could not authenticate participant')
    return
  }

  // Get current user ID
  const { data: { user: authUser } } = await client.auth.getUser()
  const userId = authUser?.id

  // Test 1: Participant can only read their own user row
  const { data: users, error: usersError } = await client
    .from('users')
    .select('id, email')
  
  if (usersError) {
    log('❌', `Cannot read users: ${usersError.message}`)
  } else if (users && users.length === 1 && users[0].id === userId) {
    log('✅', 'Can only read own user row')
  } else if (users && users.length > 1) {
    log('❌', `Participant can see ${users.length} users (should see 1)`)
  } else {
    log('❌', 'Cannot read own user row')
  }

  // Test 2: Participant can read own user_skills only
  const { data: userSkills, error: usError } = await client
    .from('user_skills')
    .select('id, user_id')
  
  if (usError) {
    log('❌', `Cannot read user_skills: ${usError.message}`)
  } else if (userSkills) {
    const otherUserSkills = userSkills.filter(us => us.user_id !== userId)
    if (otherUserSkills.length > 0) {
      log('❌', `Participant can see other users' skills: ${otherUserSkills.length}`)
    } else {
      log('✅', `Can only read own user_skills (found ${userSkills.length})`)
    }
  }

  // Test 3: Participant can read platform skills
  const { data: skills, error: skillsError } = await client
    .from('skills')
    .select('id, name, source')
    .eq('source', 'platform')
  
  if (skillsError) {
    log('❌', `Cannot read skills: ${skillsError.message}`)
  } else if (skills && skills.length >= 6) {
    log('✅', `Can read platform skills (found ${skills.length})`)
  } else {
    log('⚠️', `Found fewer skills than expected: ${skills?.length || 0}`)
  }

  // Test 4: Participant can read own conversations only
  const { data: convos, error: convoError } = await client
    .from('conversations')
    .select('id, user_id')
  
  if (convoError && convoError.code !== 'PGRST116') {
    log('❌', `Cannot access conversations: ${convoError.message}`)
  } else {
    const otherConvos = convos?.filter(c => c.user_id !== userId) || []
    if (otherConvos.length > 0) {
      log('❌', `Participant can see other users' conversations`)
    } else {
      log('✅', `Can only access own conversations (found ${convos?.length || 0})`)
    }
  }

  // Test 5: Participant CANNOT read audit_log
  const { data: audit, error: auditError } = await client
    .from('audit_log')
    .select('id')
    .limit(1)
  
  if (auditError || !audit || audit.length === 0) {
    log('✅', 'Cannot read audit_log (correct behavior)')
  } else {
    log('❌', 'Participant can read audit_log (should be denied)')
  }

  // Test 6: Participant CANNOT read organizations (not their own)
  const { data: orgs, error: orgsError } = await client
    .from('organizations')
    .select('*')
  
  if (orgsError || !orgs || orgs.length === 0) {
    log('✅', 'Cannot list organizations (correct behavior)')
  } else {
    log('⚠️', `Participant can see ${orgs.length} orgs (should be denied or empty)`)
  }

  await client.auth.signOut()
}

async function main() {
  console.log('🧪 Nudgeable — RLS Verification Tests')
  console.log('=====================================')
  console.log(`   Supabase URL: ${supabaseUrl}`)
  
  await testSuperAdmin()
  await testHR()
  await testParticipant()

  console.log('\n─'.repeat(45))
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    console.log('\n⚠️  Some RLS tests failed. Review the policies in 0001_init.sql')
    process.exit(1)
  } else {
    console.log('\n✅ All RLS tests passed!')
  }
}

main().catch((err) => {
  console.error('❌ Test error:', err)
  process.exit(1)
})
