'use client'
// src/app/change-password/page.tsx
// Force password change screen - shown when users.must_change_pw = true

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must include uppercase, lowercase, and a number')
      setLoading(false)
      return
    }

    try {
      // Update auth password
      const { error: authError } = await supabase.auth.updateUser({ password })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired. Please log in again.')
        setLoading(false)
        return
      }

      // Update must_change_pw flag in users table
      const { error: profileError } = await supabase
        .from('users')
        .update({ must_change_pw: false, plain_password: null })
        .eq('id', user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Non-fatal - password is changed, flag update can be retried
      }

      // Redirect to home - middleware will route to correct dashboard
      router.push('/')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #221D23 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-md px-4 animate-fade-up">
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
          <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>

          <h1 className="text-xl font-black text-brand-dark mb-1">Set your password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Create a secure password for your account. You&apos;ll use this to sign in from now on.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-dark mb-1.5 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition-all"
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pb-2">
              <p className="font-semibold text-brand-dark">Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground/80">
                <li>At least 8 characters</li>
                <li>Uppercase and lowercase letters</li>
                <li>At least one number</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-brand-purple text-white text-sm font-black tracking-wide
                         hover:bg-brand-purple/90 active:scale-[0.98] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating…' : 'Set password & continue →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          This is a one-time setup. Contact your admin if you need help.
        </p>
      </div>
    </div>
  )
}
