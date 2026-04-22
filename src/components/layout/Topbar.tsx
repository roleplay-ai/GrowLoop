'use client'
// src/components/layout/Topbar.tsx
interface Props {
  title:        string
  phase?:       'pre' | 'training' | 'post'
  rightSlot?:   React.ReactNode
}

const PHASE_LABELS: Record<string, string> = {
  pre:      'Pre-Training',
  training: 'In Training',
  post:     'Post-Training',
}

export default function Topbar({ title, phase, rightSlot }: Props) {
  return (
    <header className="bg-white border-b border-card-border px-6 h-14 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-extrabold text-brand-dark">{title}</h1>
        {phase && (
          <span className={`phase-badge phase-badge-${phase}`}>
            {PHASE_LABELS[phase]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {rightSlot}
        {/* Online indicator */}
        <div className="flex items-center gap-1.5 bg-[#F0FFF7] border border-brand-green/20 rounded-full px-3 py-1 text-[11px] font-semibold text-brand-green">
          <span className="w-[7px] h-[7px] rounded-full bg-brand-green animate-streak-pulse" />
          Online
        </div>
      </div>
    </header>
  )
}
