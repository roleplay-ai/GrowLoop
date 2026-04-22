'use client'
// src/app/(auth)/login/page.tsx
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Middleware will redirect to correct role dashboard
    router.push('/')
    router.refresh()
  }

  return (
    <div className="animate-fade-up">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center text-sm font-black text-brand-dark">
          N
        </div>
        <span className="text-xs font-black tracking-[3px] text-brand-yellow uppercase">
          Nudgeable
        </span>
      </div>

      <div className="nudge-card rounded-xl p-8">
        <h1 className="text-xl font-black text-brand-dark mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide">
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs font-semibold text-brand-purple hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-brand-dark text-white text-sm font-black tracking-wide
                       hover:bg-brand-dark/90 active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        Your credentials were emailed to you by your admin.
      </p>
    </div>
  )
}
