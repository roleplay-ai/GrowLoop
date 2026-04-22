'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHR, resetHRPassword, deactivateHR, reactivateHR } from './actions'

interface User {
  id: string
  name: string
  email: string
  status: string
  avatar_color?: string
  created_at: string
  last_active_at?: string
}

interface Org {
  id: string
  name: string
}

interface Props {
  org: Org
  hrUsers: User[]
}

export default function HRManagement({ org, hrUsers }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [resetModalUser, setResetModalUser] = useState<User | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [resetPassword, setResetPasswordValue] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.set('name', name)
    formData.set('email', email)
    formData.set('password', password)
    formData.set('orgId', org.id)

    const result = await createHR(formData)

    if (result.success && result.credentials) {
      setCredentials(result.credentials)
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      router.refresh()
    } else {
      setError(result.error ?? 'Failed to create HR user')
    }

    setIsSubmitting(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser) return

    setIsResetting(true)
    setResetError(null)

    if (resetPassword !== resetConfirm) {
      setResetError('Passwords do not match')
      setIsResetting(false)
      return
    }

    const result = await resetHRPassword(resetModalUser.id, org.id, resetPassword)
    if (result.success && result.credentials) {
      setCredentials(result.credentials)
      setResetModalUser(null)
      setResetPasswordValue('')
      setResetConfirm('')
    } else {
      setResetError(result.error ?? 'Failed to reset password')
    }
    setIsResetting(false)
  }

  const handleToggleStatus = async (user: User) => {
    setActionLoading(user.id)
    if (user.status === 'active') {
      await deactivateHR(user.id, org.id)
    } else {
      await reactivateHR(user.id, org.id)
    }
    router.refresh()
    setActionLoading(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      {/* Header with add button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-brand-dark">HR Administrators</h2>
          <p className="text-xs text-muted-foreground">Manage HR users who can access this organization</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-brand-dark text-white text-xs font-black rounded-lg hover:bg-brand-dark/90 transition-colors"
        >
          + Add HR User
        </button>
      </div>

      {/* HR Users Table */}
      <div className="nudge-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              {['User', 'Email', 'Status', 'Created', 'Last Active', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hrUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-sm text-muted-foreground">No HR users yet</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-3 text-xs font-bold text-brand-purple hover:underline"
                  >
                    Add your first HR administrator
                  </button>
                </td>
              </tr>
            ) : (
              hrUsers.map(user => (
                <tr key={user.id} className="border-b border-card-border/50 hover:bg-brand-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: user.avatar_color ?? '#623CEA' }}
                      >
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-brand-dark">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-2 py-1 ${
                      user.status === 'active' 
                        ? 'bg-brand-green/10 text-brand-green' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.last_active_at 
                      ? new Date(user.last_active_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setResetModalUser(user)}
                        disabled={actionLoading === user.id}
                        className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5 disabled:opacity-50"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={actionLoading === user.id}
                        className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded hover:bg-brand-cream disabled:opacity-50"
                      >
                        {actionLoading === user.id ? '...' : user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create HR Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <h2 className="text-lg font-black text-white mb-1">Add HR Administrator</h2>
            <p className="text-xs text-white/50 mb-6">Create a new HR user for {org.name}</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
                <p className="text-[10px] text-white/40 mt-1">
                  HR user will be required to change this password on first login
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create HR User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setResetModalUser(null)
            setResetPasswordValue('')
            setResetConfirm('')
            setResetError(null)
          }} />
          <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <h2 className="text-lg font-black text-white mb-1">Reset Password</h2>
            <p className="text-xs text-white/50 mb-6">
              Set a new password for <span className="text-brand-yellow">{resetModalUser.name}</span> ({resetModalUser.email})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              {resetError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {resetError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUser(null)
                    setResetPasswordValue('')
                    setResetConfirm('')
                    setResetError(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
                  disabled={isResetting}
                >
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCredentials(null)} />
          <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-lg font-black text-white">Credentials Set</h2>
              <p className="text-xs text-white/50 mt-1">Share these credentials with the HR user. They will be prompted to change on first login.</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wide">Email</div>
                    <div className="text-sm text-white font-mono">{credentials.email}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentials.email)}
                    className="text-xs text-brand-yellow hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wide">Temporary Password</div>
                    <div className="text-sm text-white font-mono">{credentials.password}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentials.password)}
                    className="text-xs text-brand-yellow hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
                setCredentials(null)
                setIsModalOpen(false)
              }}
              className="w-full px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors"
            >
              Copy All & Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
