// src/lib/supabase/server.ts
// Server-side Supabase client (Server Components, Server Actions, Route Handlers)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Can be called from Server Component — ignore
          }
        },
      },
    }
  )
}

// Service-role client — ONLY for server actions that need to bypass RLS.
// IMPORTANT: cookies are intentionally ignored so the service role key is
// used for the Authorization header on every request, not the user's session
// JWT. If you pass the user's cookies here @supabase/ssr will inject their
// JWT and RLS will still apply as that user.
export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
