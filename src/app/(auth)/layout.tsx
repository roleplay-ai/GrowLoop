// src/app/(auth)/layout.tsx
// Prevent static generation for auth routes (requires runtime env vars)
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
      <div className="relative w-full max-w-md px-4">{children}</div>
    </div>
  )
}
