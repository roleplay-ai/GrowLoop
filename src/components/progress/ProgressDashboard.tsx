'use client'
// src/components/progress/ProgressDashboard.tsx
// DUMMY UI — all data hardcoded for showcase purposes.
import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Trophy,
  Flame,
  Target,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  ChevronRight,
} from 'lucide-react'

// ── Dummy data ──────────────────────────────────────────────────────────────
const SKILLS = [
  {
    id: 'sk1',
    icon: '💬',
    name: 'Giving Feedback',
    phase: 'training' as const,
    baseline: 2.8,
    current: 4.1,
    self: 3.6,
    spark: [2.8, 2.9, 3.1, 3.4, 3.6, 3.8, 4.1],
    peers: 12,
    rounds: 2,
  },
  {
    id: 'sk2',
    icon: '🎤',
    name: 'Executive Presence',
    phase: 'pre' as const,
    baseline: 2.4,
    current: 2.6,
    self: 3.1,
    spark: [2.4, 2.4, 2.5, 2.5, 2.6, 2.6, 2.6],
    peers: 9,
    rounds: 1,
  },
  {
    id: 'sk3',
    icon: '🤝',
    name: 'Negotiation',
    phase: 'post' as const,
    baseline: 3.2,
    current: 4.4,
    self: 4.1,
    spark: [3.2, 3.3, 3.6, 3.9, 4.1, 4.3, 4.4],
    peers: 14,
    rounds: 3,
  },
  {
    id: 'sk4',
    icon: '👂',
    name: 'Active Listening',
    phase: 'training' as const,
    baseline: 3.0,
    current: 2.9,
    self: 3.4,
    spark: [3.0, 3.1, 3.0, 2.9, 2.9, 2.9, 2.9],
    peers: 11,
    rounds: 1,
  },
]

const ROUNDS = [
  { id: 'r1', skill: 'Negotiation', round: 3, peer: 4.4, self: 4.1, peers: 14, date: 'Apr 19, 2026', state: 'closed' as const },
  { id: 'r2', skill: 'Giving Feedback', round: 2, peer: 4.1, self: 3.6, peers: 12, date: 'Apr 12, 2026', state: 'closed' as const },
  { id: 'r3', skill: 'Active Listening', round: 1, peer: 2.9, self: 3.4, peers: 11, date: 'Apr 5, 2026', state: 'closed' as const },
  { id: 'r4', skill: 'Executive Presence', round: 1, peer: 2.6, self: 3.1, peers: 9, date: 'Mar 28, 2026', state: 'closed' as const },
  { id: 'r5', skill: 'Negotiation', round: 4, peer: null, self: null, peers: 0, date: 'In progress', state: 'open' as const },
]

const STRENGTHS = [
  { dim: 'Closing', skill: 'Negotiation', score: 4.6, delta: +1.1 },
  { dim: 'Specificity', skill: 'Giving Feedback', score: 4.4, delta: +1.5 },
  { dim: 'Preparation', skill: 'Negotiation', score: 4.3, delta: +0.8 },
]

const EDGES = [
  { dim: 'Presence', skill: 'Active Listening', score: 2.6, delta: -0.2 },
  { dim: 'Gravitas', skill: 'Executive Presence', score: 2.5, delta: +0.1 },
  { dim: 'Reflection', skill: 'Active Listening', score: 2.8, delta: 0 },
]

const THEMES = [
  { type: 'praise', text: 'Always pulls the room back to the customer impact', count: 7 },
  { type: 'praise', text: 'Concrete examples land much better than vague ones', count: 5 },
  { type: 'edge', text: 'Sometimes interrupts to fix things before others can', count: 6 },
  { type: 'edge', text: "Cues you're 'rehearsing the response' instead of listening", count: 4 },
]

const MILESTONES = [
  { icon: '🎯', label: 'First Reality Check', date: 'Mar 28', done: true },
  { icon: '💪', label: 'Hit Training phase', date: 'Apr 02', done: true },
  { icon: '🔥', label: '7-day streak', date: 'Apr 09', done: true },
  { icon: '📈', label: '+1.0 peer growth', date: 'Apr 16', done: true },
  { icon: '🚀', label: 'Post-training reflection', date: 'Apr 25', done: true },
  { icon: '🏆', label: 'Master a skill (≥4.5)', date: 'May 02', done: false },
]

// ── Component ───────────────────────────────────────────────────────────────
type SkillFilter = 'all' | 'pre' | 'training' | 'post'

export default function ProgressDashboard() {
  const [filter, setFilter] = useState<SkillFilter>('all')

  const filtered = SKILLS.filter((s) => filter === 'all' || s.phase === filter)
  const totalGrowth = SKILLS.reduce((s, x) => s + (x.current - x.baseline), 0)
  const avgGrowth = totalGrowth / SKILLS.length
  const totalPeers = SKILLS.reduce((s, x) => s + x.peers, 0)
  const totalRounds = SKILLS.reduce((s, x) => s + x.rounds, 0)

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-dark to-brand-purple/40 p-6 text-white">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-yellow/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-56 h-56 bg-brand-purple/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-yellow" />
              <span className="text-[10px] font-black uppercase tracking-[2px] text-brand-yellow">
                This quarter
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              You're up{' '}
              <span className="text-brand-yellow">+{avgGrowth.toFixed(1)}</span>{' '}
              avg peer score
            </h1>
            <p className="text-white/60 text-sm mt-2 leading-relaxed max-w-md">
              Across {SKILLS.length} skills, with {totalPeers} peers weighing in over{' '}
              {totalRounds} reality checks. Keep going — Negotiation is on the verge of
              mastery.
            </p>
          </div>

          <HeroStat icon={<TrendingUp className="w-4 h-4" />} label="Avg growth" value={`+${avgGrowth.toFixed(1)}`} sub="peer score" />
          <HeroStat icon={<Users className="w-4 h-4" />} label="Peer ratings" value={String(totalPeers)} sub={`across ${totalRounds} rounds`} />
        </div>
      </div>

      {/* Streak + milestone bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="nudge-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-orange/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-brand-orange" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-brand-dark leading-none">12 days</div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] mt-1">
              Active streak
            </div>
          </div>
          <div className="ml-auto text-[10px] font-semibold text-muted-foreground">
            +3 vs last week
          </div>
        </div>
        <div className="nudge-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-green/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-brand-green" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-brand-dark leading-none">86%</div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] mt-1">
              Plan completion
            </div>
          </div>
          <div className="ml-auto text-[10px] font-semibold text-brand-green">+12% MoM</div>
        </div>
        <div className="nudge-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-yellow/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-brand-orange" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-brand-dark leading-none">5 / 6</div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] mt-1">
              Milestones unlocked
            </div>
          </div>
          <div className="ml-auto text-[10px] font-semibold text-muted-foreground">
            Next: Master a skill
          </div>
        </div>
      </div>

      {/* Skills detail */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-sm font-black text-brand-dark">By skill</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Each skill shows your peer trajectory and self-rating.
            </p>
          </div>
          <div className="flex bg-white border border-card-border rounded-lg p-1">
            {(['all', 'pre', 'training', 'post'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all capitalize ${
                  filter === f
                    ? 'bg-brand-dark text-white shadow-sm'
                    : 'text-muted-foreground hover:text-brand-dark'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <SkillProgressCard key={s.id} skill={s} />
          ))}
        </div>
      </section>

      {/* Strengths + Edges */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="nudge-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-green" />
            </div>
            <h3 className="text-sm font-black text-brand-dark">Top strengths</h3>
          </div>
          <ul className="space-y-2.5">
            {STRENGTHS.map((s) => (
              <DimensionRow key={s.dim} {...s} positive />
            ))}
          </ul>
        </div>
        <div className="nudge-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-orange/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-brand-orange" />
            </div>
            <h3 className="text-sm font-black text-brand-dark">Growing edges</h3>
          </div>
          <ul className="space-y-2.5">
            {EDGES.map((s) => (
              <DimensionRow key={s.dim} {...s} positive={false} />
            ))}
          </ul>
        </div>
      </section>

      {/* Recent themes */}
      <section className="nudge-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-brand-dark">Recent peer themes</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Patterns Nudge picked up across your last 47 peer responses.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {THEMES.map((t, i) => (
            <ThemeCard key={i} theme={t} />
          ))}
        </div>
      </section>

      {/* Reality Check History */}
      <section className="nudge-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-brand-dark">Reality Check history</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Every peer round you've run, ordered most-recent first.
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {ROUNDS.length} rounds
          </span>
        </div>
        <div className="divide-y divide-card-border">
          {ROUNDS.map((r) => (
            <div
              key={r.id}
              className="px-5 py-4 flex items-center gap-4 hover:bg-brand-cream/30 transition-colors"
            >
              <Calendar className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-brand-dark">{r.skill}</span>
                  <span className="text-[10px] font-mono px-1.5 py-px rounded bg-brand-cream text-muted-foreground">
                    Round {r.round}
                  </span>
                  {r.state === 'open' && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-px rounded bg-brand-orange/15 text-brand-orange border border-brand-orange/25">
                      In progress
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {r.date}
                  {r.peers > 0 && ` · ${r.peers} peers`}
                </div>
              </div>
              {r.peer != null && (
                <>
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="text-sm font-black text-brand-purple">{r.peer.toFixed(1)}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">peer</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="text-sm font-black text-brand-orange">{r.self?.toFixed(1)}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">self</div>
                  </div>
                </>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
          ))}
        </div>
      </section>

      {/* Milestones */}
      <section className="nudge-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-yellow/15 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-brand-orange" />
          </div>
          <h3 className="text-sm font-black text-brand-dark">Milestones</h3>
        </div>
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-card-border" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-brand-green transition-all"
            style={{ width: `calc(${(MILESTONES.filter(m => m.done).length / MILESTONES.length) * 100}% - 10px)` }}
          />
          <div className="relative grid grid-cols-3 sm:grid-cols-6 gap-3">
            {MILESTONES.map((m) => (
              <div key={m.label} className="flex flex-col items-center text-center">
                <div
                  className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${
                    m.done
                      ? 'bg-brand-green border-brand-green text-white shadow-md'
                      : 'bg-white border-card-border text-muted-foreground/50'
                  }`}
                >
                  {m.done ? '✓' : m.icon}
                </div>
                <div className="mt-2">
                  <div
                    className={`text-[10px] font-bold leading-tight ${
                      m.done ? 'text-brand-dark' : 'text-muted-foreground'
                    }`}
                  >
                    {m.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground/60 mt-0.5 font-mono">{m.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 text-white/60 mb-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[1.5px]">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] text-white/50 mt-1 font-semibold">{sub}</div>
    </div>
  )
}

function SkillProgressCard({
  skill,
}: {
  skill: typeof SKILLS[number]
}) {
  const delta = skill.current - skill.baseline
  const positive = delta > 0
  return (
    <div className="nudge-card rounded-xl p-5 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-brand-cream border border-card-border flex items-center justify-center text-2xl flex-shrink-0">
            {skill.icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-brand-dark truncate">{skill.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`phase-badge phase-badge-${skill.phase}`}>
                {skill.phase === 'pre' ? 'Pre-Training' : skill.phase === 'training' ? 'In Training' : 'Post-Training'}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                · {skill.peers} peers
              </span>
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black ${
            positive
              ? 'bg-brand-green/10 text-brand-green border border-brand-green/25'
              : delta < 0
                ? 'bg-brand-red/10 text-brand-red border border-brand-red/25'
                : 'bg-muted/40 text-muted-foreground border border-card-border'
          }`}
        >
          {positive ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {positive ? '+' : ''}
          {delta.toFixed(1)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <ScorePill label="Baseline" value={skill.baseline} tone="neutral" />
        <ScorePill label="Current" value={skill.current} tone="primary" />
        <ScorePill label="Self" value={skill.self} tone="warm" />
      </div>

      <Sparkline points={skill.spark} accent={positive ? '#23CE68' : delta < 0 ? '#ED4551' : '#623CEA'} />

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-card-border">
        <span className="text-[10px] font-mono text-muted-foreground">
          {skill.rounds} reality check{skill.rounds === 1 ? '' : 's'} run
        </span>
        <button className="text-[11px] font-bold text-brand-purple hover:underline flex items-center gap-1">
          Open skill <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function ScorePill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'primary' | 'warm' | 'neutral'
}) {
  const colors = {
    primary: 'text-brand-purple bg-brand-purple/8',
    warm: 'text-brand-orange bg-brand-orange/8',
    neutral: 'text-muted-foreground bg-brand-cream',
  }
  return (
    <div className={`rounded-lg p-2.5 text-center ${colors[tone]}`}>
      <div className="text-lg font-black leading-none">{value.toFixed(1)}</div>
      <div className="text-[9px] font-black uppercase tracking-[1.5px] mt-1 opacity-80">{label}</div>
    </div>
  )
}

function Sparkline({ points, accent }: { points: number[]; accent: string }) {
  const min = Math.min(...points, 1)
  const max = Math.max(...points, 5)
  const range = Math.max(0.5, max - min)
  const W = 280
  const H = 56
  const stepX = W / (points.length - 1)

  const pathPoints = points.map((p, i) => {
    const x = i * stepX
    const y = H - ((p - min) / range) * (H - 8) - 4
    return [x, y] as const
  })

  const path = pathPoints
    .map((pt, i) => (i === 0 ? `M ${pt[0]},${pt[1]}` : `L ${pt[0]},${pt[1]}`))
    .join(' ')

  const area = `${path} L ${W},${H} L 0,${H} Z`
  const last = pathPoints[pathPoints.length - 1]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${accent.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${accent.replace('#', '')})`} />
        <path d={path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="3.5" fill={accent} stroke="white" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground/60 mt-1">
        <span>Round 1</span>
        <span>Latest</span>
      </div>
    </div>
  )
}

function DimensionRow({
  dim,
  skill,
  score,
  delta,
  positive,
}: {
  dim: string
  skill: string
  score: number
  delta: number
  positive: boolean
}) {
  const tint = positive ? 'text-brand-green' : 'text-brand-orange'
  return (
    <li className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-brand-dark truncate">{dim}</div>
        <div className="text-[11px] text-muted-foreground truncate">{skill}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`text-base font-black ${tint}`}>{score.toFixed(1)}</div>
        <div className="text-[11px] font-bold text-muted-foreground w-10 text-right">
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}
        </div>
      </div>
    </li>
  )
}

function ThemeCard({ theme }: { theme: typeof THEMES[number] }) {
  const isPraise = theme.type === 'praise'
  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${
        isPraise
          ? 'bg-brand-green/5 border-brand-green/25'
          : 'bg-brand-orange/5 border-brand-orange/25'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
          isPraise ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-orange/15 text-brand-orange'
        }`}
      >
        {isPraise ? <Sparkles className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-brand-dark leading-relaxed">"{theme.text}"</p>
        <div
          className={`text-[10px] font-black uppercase tracking-wider mt-2 ${
            isPraise ? 'text-brand-green' : 'text-brand-orange'
          }`}
        >
          {theme.count} peers · {isPraise ? 'praise' : 'edge'}
        </div>
      </div>
    </div>
  )
}
