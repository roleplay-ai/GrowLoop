'use client'
// src/app/(auth)/login/page.tsx
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Login failed — no user returned')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-cream">
      {/* ───────────────── LEFT PANEL (Brand / Marketing) ───────────────── */}
      <div className="relative lg:flex-1 lg:min-h-screen bg-brand-dark text-white overflow-hidden flex items-center justify-center p-8 lg:p-12">
        {/* Animated gradient blobs */}
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-brand-purple/30 blur-[120px] animate-pulse" />
        <div
          className="absolute -bottom-40 -right-24 w-[500px] h-[500px] rounded-full bg-brand-yellow/20 blur-[140px] animate-pulse"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-brand-green/15 blur-[100px] animate-pulse"
          style={{ animationDelay: '0.8s' }}
        />

        {/* Dotted grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-lg w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 bg-brand-yellow rounded-xl flex items-center justify-center text-xl font-black text-brand-dark shadow-lg shadow-brand-yellow/30">
              N
            </div>
            <div>
              <div className="text-[10px] font-black tracking-[4px] text-brand-yellow/70 uppercase">
                Nudgeable
              </div>
              <div className="text-xs text-white/40 mt-0.5">Skill growth, reimagined</div>
            </div>
          </div>

          {/* Hero copy */}
          <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight mb-6">
            Grow the skills{' '}
            <span className="text-brand-yellow">that actually move</span>{' '}
            the needle.
          </h1>
          <p className="text-base text-white/60 leading-relaxed mb-12 max-w-md">
            AI-powered coaching, peer reality-checks, and action plans tailored to your
            real job. No fluff — just measurable growth.
          </p>

          {/* Feature pills */}
          <div className="space-y-4">
            <FeatureRow
              icon={<Sparkles className="w-4 h-4" />}
              title="AI Coach"
              description="Contextual, always-on, judgement-free"
              color="bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20"
            />
            <FeatureRow
              icon={<Target className="w-4 h-4" />}
              title="Reality Checks"
              description="Peer feedback that shows the blind spots"
              color="bg-brand-purple/15 text-brand-purple border-brand-purple/30"
            />
            <FeatureRow
              icon={<TrendingUp className="w-4 h-4" />}
              title="Measurable Growth"
              description="Track peer-scored progress round over round"
              color="bg-brand-green/15 text-brand-green border-brand-green/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-8 lg:left-12 text-[10px] text-white/30 font-mono">
          © {new Date().getFullYear()} Nudgeable · Built for growth
        </div>
      </div>

      {/* ───────────────── RIGHT PANEL (Login form) ───────────────── */}
      <div className="relative flex-1 flex items-center justify-center p-6 lg:p-12">
        {/* Subtle background dots */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #221D23 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative w-full max-w-md animate-fade-up">
          {/* Mobile logo (shown only when left panel hidden) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-brand-dark rounded-lg flex items-center justify-center text-sm font-black text-brand-yellow">
              N
            </div>
            <span className="text-xs font-black tracking-[3px] text-brand-dark uppercase">
              Nudgeable
            </span>
          </div>

          {/* Welcome header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-yellow/15 border border-brand-yellow/30 rounded-full text-[10px] font-black text-brand-dark uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              Welcome back
            </div>
            <h2 className="text-3xl font-black text-brand-dark tracking-tight mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the credentials your admin sent you
            </p>
          </div>

          {/* Card */}
          <div className="nudge-card rounded-2xl p-8 shadow-xl shadow-brand-dark/[0.04]">
            {error && (
              <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-brand-red/5 border border-brand-red/20 text-sm text-brand-red">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium leading-tight">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-black text-brand-dark mb-2 uppercase tracking-[2px]"
                >
                  Work Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-brand-purple transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-black text-brand-dark mb-2 uppercase tracking-[2px]"
                >
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-brand-purple transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground/60 hover:text-brand-dark hover:bg-brand-cream transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="group relative w-full py-3.5 mt-2 rounded-lg bg-brand-dark text-white text-sm font-black tracking-wide overflow-hidden
                           hover:bg-brand-dark/90 active:scale-[0.98] transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                           shadow-lg shadow-brand-dark/10 hover:shadow-brand-dark/20"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
                {/* Yellow sheen on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-yellow/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                Need help?
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Help text */}
            <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
              Your credentials were emailed to you by your admin. <br />
              Lost them? Contact your HR team to reset.
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-muted-foreground/50 mt-8 font-mono tracking-wide">
            Secured by industry-standard encryption · Protected by RLS
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="flex items-center gap-4 group">
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${color} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-white/50">{description}</div>
      </div>
    </div>
  )
}
