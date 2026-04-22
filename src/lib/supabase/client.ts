// src/lib/supabase/client.ts
// Browser-side Supabase client
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build/SSR without env vars, throw a clear error
    // This will be caught by Next.js and the page will be rendered client-side
    if (typeof window === 'undefined') {
      throw new Error('Supabase env vars not available during build')
    }
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Copy .env.local.example to .env.local and fill in your project credentials.'
    )
  }

  // Singleton pattern for client-side
  if (!client) {
    client = createBrowserClient(url, key)
  }
  return client
}
