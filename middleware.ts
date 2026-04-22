// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
  const pathname = request.nextUrl.pathname

  // ── Public routes ───────────────────────────────────────────────────────
  const publicRoutes = ['/login', '/peer-survey']
  const isPublic = publicRoutes.some(p => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) return supabaseResponse

  // ── Fetch role from custom users table ─────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('role, must_change_pw')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const mustChange = profile?.must_change_pw

  // Force password change
  if (mustChange && pathname !== '/change-password') {
    const url = request.nextUrl.clone()
    url.pathname = '/change-password'
    return NextResponse.redirect(url)
  }

  // ── Role guards ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/hr') && role !== 'hr') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/app') && role !== 'participant') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Redirect root to role-specific dashboard ────────────────────────────
  if (pathname === '/') {
    const destinations: Record<string, string> = {
      super_admin: '/super-admin/orgs',
      hr:          '/hr/insights',
      participant: '/app/skills',
    }
    if (role && destinations[role]) {
      return NextResponse.redirect(new URL(destinations[role], request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
