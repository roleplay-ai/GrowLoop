'use client'
// src/components/plan/ActionPlanBoard.tsx
// DUMMY UI — all data hardcoded for showcase purposes.
import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Flame,
  Calendar,
  Target,
  AlertTriangle,
  Trophy,
  Sparkles,
  Clock,
  ArrowRight,
  MoreHorizontal,
  Zap,
  TrendingUp,
} from 'lucide-react'

// ── Dummy data ──────────────────────────────────────────────────────────────
type ActionStatus = 'todo' | 'doing' | 'done' | 'overdue'

interface Action {
  id: string
  title: string
  what: string
  why: string
  difficulty: 1 | 2 | 3 | 4 | 5
  effortDays: number
  status: ActionStatus
  due: string
  dueRel: string
  skill: string
  skillIcon: string
  doneAt?: string
}

const ACTIONS: Action[] = [
  {
    id: 'a1',
    title: 'Run a feedback rehearsal with one peer',
    what: 'Pick a recent feedback moment that felt off. Walk a peer through what you said and what you wanted to say.',
    why: 'You scored 4.4 on Specificity but only 2.9 on Timing. Rehearsal fixes timing fast.',
    difficulty: 2,
    effortDays: 1,
    status: 'doing',
    due: 'Today',
    dueRel: 'Apr 25',
    skill: 'Giving Feedback',
    skillIcon: '💬',
  },
  {
    id: 'a2',
    title: 'Write the negotiation prep doc before your next 1:1',
    what: 'Use the BATNA template — interests, walk-away point, three concession ladders.',
    why: 'Preparation is your highest-leverage dimension. You skipped it in 2/3 last rounds.',
    difficulty: 3,
    effortDays: 2,
    status: 'todo',
    due: 'Tomorrow',
    dueRel: 'Apr 26',
    skill: 'Negotiation',
    skillIcon: '🤝',
  },
  {
    id: 'a3',
    title: 'Try the 3-second pause in your next meeting',
    what: 'When someone finishes speaking, count to three before replying. Notice what surfaces.',
    why: 'Peers say you "rehearse the response" — pausing breaks that pattern.',
    difficulty: 1,
    effortDays: 1,
    status: 'overdue',
    due: 'Yesterday',
    dueRel: 'Apr 24',
    skill: 'Active Listening',
    skillIcon: '👂',
  },
  {
    id: 'a4',
    title: 'Record yourself giving the "Q2 priorities" walk-through',
    what: 'Two-minute screen recording. Watch it back. Note pace, fillers, posture.',
    why: 'Self-review is the fastest feedback for executive presence.',
    difficulty: 2,
    effortDays: 2,
    status: 'todo',
    due: 'This week',
    dueRel: 'Apr 28',
    skill: 'Executive Presence',
    skillIcon: '🎤',
  },
  {
    id: 'a5',
    title: 'Send specific feedback to two reports this week',
    what: 'One praise, one growth — both with concrete behaviour + impact.',
    why: 'Practice loop on Specificity (your strongest dim).',
    difficulty: 2,
    effortDays: 4,
    status: 'todo',
    due: 'This week',
    dueRel: 'Apr 30',
    skill: 'Giving Feedback',
    skillIcon: '💬',
  },
  {
    id: 'a6',
    title: 'Lock in the next Reality Check round',
    what: 'Review your peer list, swap stale invites, schedule the close date.',
    why: 'Round 4 is overdue — momentum matters more than perfection.',
    difficulty: 1,
    effortDays: 1,
    status: 'todo',
    due: 'This week',
    dueRel: 'May 02',
    skill: 'Negotiation',
    skillIcon: '🤝',
  },
  {
    id: 'a7',
    title: 'Reflect on last week in 3 bullets',
    what: 'What did I try? What landed? What needs another rep?',
    why: 'Reflection cements the lessons faster than another action.',
    difficulty: 1,
    effortDays: 1,
    status: 'done',
    due: 'Apr 22',
    dueRel: '3 days ago',
    skill: 'Giving Feedback',
    skillIcon: '💬',
    doneAt: 'Apr 22',
  },
  {
    id: 'a8',
    title: 'Read "Crucial Conversations" Ch. 4',
    what: '"How to talk when stakes are high." Annotate three lines that surprise you.',
    why: 'Book-club assignment — keeps your training cohort in sync.',
    difficulty: 1,
    effortDays: 2,
    status: 'done',
    due: 'Apr 20',
    dueRel: '5 days ago',
    skill: 'Active Listening',
    skillIcon: '👂',
    doneAt: 'Apr 20',
  },
]

const SKILL_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Giving Feedback', label: '💬 Feedback' },
  { id: 'Negotiation', label: '🤝 Negotiation' },
  { id: 'Active Listening', label: '👂 Listening' },
  { id: 'Executive Presence', label: '🎤 Presence' },
]

type StatusFilter = 'today' | 'week' | 'all' | 'done'

export default function ActionPlanBoard() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('today')
  const [skillFilter, setSkillFilter] = useState<string>('all')

  const stats = useMemo(() => {
    const total = ACTIONS.length
    const done = ACTIONS.filter((a) => a.status === 'done').length
    const overdue = ACTIONS.filter((a) => a.status === 'overdue').length
    const today = ACTIONS.filter((a) => a.due === 'Today' || a.status === 'doing').length
    return { total, done, overdue, today, pct: Math.round((done / total) * 100) }
  }, [])

  const filtered = useMemo(() => {
    return ACTIONS.filter((a) => {
      if (skillFilter !== 'all' && a.skill !== skillFilter) return false
      if (statusFilter === 'today') return a.due === 'Today' || a.status === 'doing' || a.status === 'overdue'
      if (statusFilter === 'week') return a.status !== 'done'
      if (statusFilter === 'done') return a.status === 'done'
      return true
    })
  }, [statusFilter, skillFilter])

  const grouped = useMemo(() => {
    const buckets: Record<string, Action[]> = {
      Overdue: [],
      Today: [],
      'This week': [],
      Done: [],
    }
    for (const a of filtered) {
      if (a.status === 'overdue') buckets.Overdue.push(a)
      else if (a.status === 'done') buckets.Done.push(a)
      else if (a.due === 'Today' || a.status === 'doing') buckets.Today.push(a)
      else buckets['This week'].push(a)
    }
    return buckets
  }, [filtered])

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple via-brand-purple to-brand-dark p-6 text-white">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-yellow/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-3xl">
              🎯
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
                <span className="text-[10px] font-black uppercase tracking-[2px] text-brand-yellow">
                  Today's focus
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black leading-tight">
                {stats.today} actions waiting on you, {stats.overdue}{' '}
                <span className="text-brand-yellow">need rescue</span>
              </h2>
              <p className="text-white/70 text-sm mt-2 leading-relaxed">
                You're {stats.pct}% through this cycle's plan. Knock out today's three
                and you'll be back on streak.
              </p>
              <button className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-brand-yellow text-brand-dark text-xs font-black hover:bg-brand-yellow/90 active:scale-95 transition-all shadow-md">
                <Zap className="w-3.5 h-3.5" />
                Start with the easiest
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={<Flame className="w-4 h-4 text-brand-orange" />}
            value="12"
            label="Day streak"
            tint="bg-brand-orange/15"
          />
          <StatTile
            icon={<CheckCircle2 className="w-4 h-4 text-brand-green" />}
            value={`${stats.done}/${stats.total}`}
            label="Done"
            tint="bg-brand-green/15"
          />
          <StatTile
            icon={<AlertTriangle className="w-4 h-4 text-brand-red" />}
            value={String(stats.overdue)}
            label="Overdue"
            tint="bg-brand-red/15"
          />
          <StatTile
            icon={<TrendingUp className="w-4 h-4 text-brand-purple" />}
            value="+24%"
            label="Vs last wk"
            tint="bg-brand-purple/15"
          />
        </div>
      </div>

      {/* Plan progress bar */}
      <div className="nudge-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-brand-dark">This cycle</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.done} of {stats.total} actions complete
            </p>
          </div>
          <span className="text-2xl font-black text-brand-purple">{stats.pct}%</span>
        </div>
        <div className="h-2.5 bg-brand-cream rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-purple to-brand-green rounded-full transition-all duration-700 relative"
            style={{ width: `${stats.pct}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-streak-pulse rounded-full" />
          </div>
        </div>
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground/60 mt-1.5">
          <span>Apr 21</span>
          <span>Apr 28</span>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3">
        <div className="flex bg-white border border-card-border rounded-lg p-1 self-start">
          {([
            { id: 'today', label: 'Today', count: stats.today + stats.overdue },
            { id: 'week', label: 'This week', count: ACTIONS.filter(a => a.status !== 'done').length },
            { id: 'all', label: 'All', count: stats.total },
            { id: 'done', label: 'Done', count: stats.done },
          ] as { id: StatusFilter; label: string; count: number }[]).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`text-[11px] font-bold px-3.5 py-1.5 rounded-md transition-all ${
                statusFilter === f.id
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-muted-foreground hover:text-brand-dark'
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 text-[10px] font-mono ${
                  statusFilter === f.id ? 'text-white/60' : 'text-muted-foreground/60'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SKILL_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkillFilter(s.id)}
              className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                skillFilter === s.id
                  ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple'
                  : 'bg-white border-card-border text-muted-foreground hover:text-brand-dark hover:border-brand-purple/30'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action list — grouped */}
      <div className="space-y-5">
        {(['Overdue', 'Today', 'This week', 'Done'] as const).map((bucket) => {
          const items = grouped[bucket]
          if (!items || items.length === 0) return null
          return (
            <section key={bucket}>
              <div className="flex items-center gap-2 mb-2.5">
                <BucketIcon name={bucket} />
                <h3
                  className={`text-[11px] font-black uppercase tracking-[1.5px] ${
                    bucket === 'Overdue'
                      ? 'text-brand-red'
                      : bucket === 'Today'
                        ? 'text-brand-purple'
                        : bucket === 'Done'
                          ? 'text-brand-green'
                          : 'text-brand-dark'
                  }`}
                >
                  {bucket}
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  ({items.length})
                </span>
                <div className="flex-1 h-px bg-card-border" />
              </div>
              <div className="space-y-2.5">
                {items.map((a) => (
                  <ActionRow key={a.id} action={a} />
                ))}
              </div>
            </section>
          )
        })}

        {filtered.length === 0 && (
          <div className="nudge-card rounded-xl p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-cream mx-auto mb-3 flex items-center justify-center text-2xl">
              🎉
            </div>
            <h3 className="text-sm font-bold text-brand-dark mb-1">
              Nothing here for that filter
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Try a different view above. Or take a breather — you've earned it.
            </p>
          </div>
        )}
      </div>

      {/* Footer celebration */}
      <div className="nudge-card rounded-xl p-5 flex items-center gap-4 bg-gradient-to-r from-brand-yellow/10 via-brand-cream to-brand-green/10">
        <div className="w-12 h-12 rounded-2xl bg-brand-yellow/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-brand-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-brand-dark">You're 4 actions from a new milestone</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Complete 4 more this week to unlock <span className="font-bold">"Streak Master"</span>.
          </p>
        </div>
        <button className="text-xs font-bold text-brand-purple hover:underline whitespace-nowrap">
          See badges →
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatTile({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode
  value: string
  label: string
  tint: string
}) {
  return (
    <div className="nudge-card rounded-xl p-3.5 flex flex-col">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tint}`}>
        {icon}
      </div>
      <div className="text-lg font-black text-brand-dark leading-none mt-2.5">{value}</div>
      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] mt-1">
        {label}
      </div>
    </div>
  )
}

function BucketIcon({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    Overdue: <AlertTriangle className="w-3.5 h-3.5 text-brand-red" />,
    Today: <Target className="w-3.5 h-3.5 text-brand-purple" />,
    'This week': <Calendar className="w-3.5 h-3.5 text-brand-dark" />,
    Done: <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />,
  }
  return <>{map[name]}</>
}

function ActionRow({ action }: { action: Action }) {
  const [expanded, setExpanded] = useState(false)
  const [done, setDone] = useState(action.status === 'done')

  const isOverdue = action.status === 'overdue' && !done
  const isDoing = action.status === 'doing' && !done

  return (
    <div
      className={`nudge-card rounded-xl transition-all overflow-hidden ${
        done ? 'opacity-60' : ''
      } ${isOverdue ? 'border-brand-red/40 bg-brand-red/2' : ''} ${
        isDoing ? 'ring-2 ring-brand-purple/20' : ''
      }`}
    >
      <div className="p-4 flex items-start gap-3">
        <button
          onClick={() => setDone((d) => !d)}
          className="mt-0.5 flex-shrink-0 group"
          aria-label={done ? 'Mark not done' : 'Mark done'}
        >
          {done ? (
            <CheckCircle2 className="w-6 h-6 text-brand-green" />
          ) : (
            <Circle className="w-6 h-6 text-card-border group-hover:text-brand-purple transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h4
              className={`text-sm font-bold leading-snug ${
                done ? 'line-through text-muted-foreground' : 'text-brand-dark'
              }`}
            >
              {action.title}
            </h4>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-6 h-6 rounded-md hover:bg-brand-cream flex items-center justify-center text-muted-foreground flex-shrink-0"
              aria-label="Expand"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-brand-cream rounded-full px-2 py-0.5">
              <span>{action.skillIcon}</span>
              {action.skill}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                isOverdue
                  ? 'bg-brand-red/10 text-brand-red border border-brand-red/25'
                  : done
                    ? 'bg-brand-green/10 text-brand-green border border-brand-green/25'
                    : action.due === 'Today'
                      ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/25'
                      : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              {done && action.doneAt ? `Done ${action.doneAt}` : action.due}
            </span>
            <DifficultyDots level={action.difficulty} />
            <span className="text-[10px] font-mono text-muted-foreground/60">
              ~{action.effortDays}d effort
            </span>
            {isDoing && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-brand-purple bg-brand-purple/10 rounded-full px-2 py-0.5 animate-streak-pulse">
                <Zap className="w-2.5 h-2.5" />
                Active
              </span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-card-border space-y-3 animate-fade-up">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[1.5px] text-muted-foreground mb-1">
                  What
                </div>
                <p className="text-xs text-brand-dark leading-relaxed">{action.what}</p>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[1.5px] text-muted-foreground mb-1">
                  Why this matters
                </div>
                <p className="text-xs text-brand-dark/80 leading-relaxed italic">
                  {action.why}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="px-3 py-1.5 rounded-md bg-brand-dark text-white text-[11px] font-black hover:bg-brand-dark/90 transition-colors flex items-center gap-1.5">
                  Mark as doing
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button className="px-3 py-1.5 rounded-md border border-card-border text-brand-dark text-[11px] font-bold hover:bg-brand-cream transition-colors">
                  Snooze
                </button>
                <button className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground text-[11px] font-bold hover:bg-brand-cream transition-colors ml-auto">
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DifficultyDots({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"
      title={`Difficulty ${level}/5`}
    >
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i < level ? 'bg-brand-purple' : 'bg-card-border'
            }`}
          />
        ))}
      </span>
    </span>
  )
}
