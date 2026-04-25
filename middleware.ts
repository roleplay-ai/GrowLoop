// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ── Public routes (no auth required) ────────────────────────────────────
  const publicRoutes = ['/login', '/peer-survey', '/change-password']
  const isPublic = publicRoutes.some(p => pathname.startsWith(p))

  if (isPublic) {
    return NextResponse.next()
  }

  // ── Protected routes - require Supabase auth ────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST be called before any auth checks
  const { data: { user } } = await supabase.auth.getUser()

  console.log('[Middleware] Path:', pathname, '| User:', user?.id ?? 'none')

  // If no user, redirect to login
  if (!user) {
    console.log('[Middleware] No user, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Fetch role from custom users table ─────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('[Middleware] Profile:', profile, '| Error:', profileError)

  const role = profile?.role

  console.log('[Middleware] Role:', role)

  // If no profile found, redirect to login
  if (!profile || !role) {
    console.log('[Middleware] No profile/role found, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Role guards ─────────────────────────────────────────────────────────
  // Note: (app), (hr), (super-admin) are route groups - parentheses don't appear in URL
  const superAdminRoutes = ['/orgs', '/admin-skills', '/prompts', '/billing', '/flags', '/audit', '/llm']
  const hrRoutes = ['/insights', '/participants', '/groups', '/hr-skills', '/settings']
  const participantRoutes = ['/skills', '/progress', '/plan', '/community']

  if (superAdminRoutes.some(r => pathname.startsWith(r)) && role !== 'super_admin') {
    console.log('[Middleware] Not super_admin, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (hrRoutes.some(r => pathname.startsWith(r)) && role !== 'hr') {
    console.log('[Middleware] Not hr, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (participantRoutes.some(r => pathname.startsWith(r)) && role !== 'participant') {
    console.log('[Middleware] Not participant, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Redirect root to role-specific dashboard ────────────────────────────
  if (pathname === '/') {
    const destinations: Record<string, string> = {
      super_admin: '/orgs',
      hr:          '/insights',
      participant: '/skills',
    }
    console.log('[Middleware] At root, role is:', role, '| Redirecting to:', destinations[role])
    if (role && destinations[role]) {
      return NextResponse.redirect(new URL(destinations[role], request.url))
    }
    // If no role, go to login
    console.log('[Middleware] No valid role for redirect, going to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
