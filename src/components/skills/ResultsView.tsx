'use client'
// src/components/skills/ResultsView.tsx
//
// Visual breakdown for a closed Reality Check round. Mirrors the L&D mock:
//   * Hero card with self/peer averages + growth pill
//   * Per-dimension self-vs-peer bar chart (sorted by gap)
//   * Themes section (chips) backed by LLM clustering output
//   * "Biggest blind spot" call-out
//
// Pure client component — receives all data as props from the server page.

import type { SkillDimension } from '@/lib/types'
import {
  type DimensionRow,
  RELATION_LABELS,
} from '@/lib/reality-check/helpers'

export interface RoundHistoryRow {
  round_number: number
  closed_at: string | null
  self_avg: number
  peer_avg: number
}

export interface ThemeRow {
  name: string
  count: number
  sample?: string
}

interface Props {
  skillName: string
  skillIcon: string | null
  dimensions: SkillDimension[]
  rows: DimensionRow[]
  selfAvg: number
  peerAvg: number
  baselinePeer: number | null
  peerGrowth: number | null
  rcRound: number
  closedAt: string | null
  peerCount: number
  themes: ThemeRow[]
  selfComments: string | null
  history: RoundHistoryRow[]
  invites: Array<{ peer_relation: string | null; status: string }>
  userSkillId: string
}

export default function ResultsView({
  skillName,
  skillIcon,
  rows,
  selfAvg,
  peerAvg,
  baselinePeer,
  peerGrowth,
  rcRound,
  closedAt,
  peerCount,
  themes,
  selfComments,
  history,
  invites,
}: Props) {
  const worst = rows[0]
  const best = rows[rows.length - 1]
  const hasGrowth = baselinePeer != null && peerGrowth != null && peerGrowth !== 0
  const overallGap = +(peerAvg - selfAvg).toFixed(2)

  // Group invites by relation for the response-mix pill row.
  const responseMix = invites
    .filter((i) => i.status === 'submitted')
    .reduce<Record<string, number>>((acc, i) => {
      const k = i.peer_relation ?? 'peer'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      {/* Hero */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#221D23,#2E1A5A)' }}
      >
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-brand-purple/15" />
        <div className="relative">
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-brand-yellow uppercase">
            {skillIcon ?? '🧠'} {skillName} ·{' '}
            {rcRound > 1 ? `Round ${rcRound} · Growth check` : 'Baseline'}
          </div>
          <div className="text-xl sm:text-2xl font-black mt-2 leading-snug">
            {hasGrowth && peerGrowth! > 0 ? (
              <>
                You grew from{' '}
                <span className="text-brand-yellow">{baselinePeer!.toFixed(1)}</span> →{' '}
                <span className="text-brand-green">{peerAvg.toFixed(1)}</span>. Your team
                sees the shift.
              </>
            ) : worst && worst.gap < 0 ? (
              <>
                Peers see <span className="text-brand-yellow">{worst.name.toLowerCase()}</span>{' '}
                differently than you do.
              </>
            ) : (
              <>You and your team are calibrated. Now build on your strengths.</>
            )}
          </div>
          <div className="text-sm mt-3 opacity-80 leading-relaxed">
            {worst && worst.gap < 0 ? (
              <>
                Biggest blind spot:{' '}
                <span className="text-brand-yellow font-bold">{worst.name}</span> — a{' '}
                <span className="text-brand-red font-extrabold">{worst.gap.toFixed(1)}</span> gap
                between you and your peers.
              </>
            ) : (
              <>
                {peerCount} peer{peerCount === 1 ? '' : 's'} responded.{' '}
                {closedAt && `Closed ${new Date(closedAt).toLocaleDateString()}.`}
              </>
            )}
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Stat value={selfAvg.toFixed(1)} label="Self rating" tone="purple" />
            <Stat value={peerAvg.toFixed(1)} label="Peer avg" tone="green" />
            {hasGrowth ? (
              <Stat
                value={`${peerGrowth! > 0 ? '+' : ''}${peerGrowth!.toFixed(1)}`}
                label="Growth"
                tone={peerGrowth! >= 0 ? 'green' : 'red'}
              />
            ) : (
              <Stat
                value={`${overallGap > 0 ? '+' : ''}${overallGap.toFixed(1)}`}
                label="Gap"
                tone={overallGap >= 0 ? 'green' : 'red'}
              />
            )}
          </div>

          {/* Response mix */}
          {Object.keys(responseMix).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(responseMix).map(([k, n]) => (
                <span
                  key={k}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/80"
                >
                  {RELATION_LABELS[k] ?? k}: {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="nudge-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-black text-brand-dark">📊 Dimension breakdown</h2>
          <span className="text-[11px] font-bold text-muted-foreground">
            sorted by gap · work on red first
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          {peerCount} peer response{peerCount === 1 ? '' : 's'} · 1 = Low · 5 = High
        </p>
        <div className="space-y-5">
          {rows.map((r) => (
            <DimensionBar key={r.id} row={r} />
          ))}
        </div>

        {worst && worst.gap < -0.3 && (
          <div className="mt-5 rounded-r-xl border-l-4 border-brand-red bg-red-50 p-4">
            <div className="text-[10px] font-extrabold text-brand-red uppercase tracking-wide">
              🔴 Biggest blind spot
            </div>
            <div className="text-sm font-bold text-brand-dark mt-1">{worst.name}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
              You rate yourself higher than your team experiences it. Highest-leverage area
              to focus on first.
            </div>
          </div>
        )}
        {best && best.gap > 0.3 && (
          <div className="mt-3 rounded-r-xl border-l-4 border-brand-green bg-green-50 p-4">
            <div className="text-[10px] font-extrabold text-brand-green uppercase tracking-wide">
              🟢 Your team sees a strength
            </div>
            <div className="text-sm font-bold text-brand-dark mt-1">{best.name}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Peers rate you higher than you rate yourself — own this and lean in.
            </div>
          </div>
        )}
      </div>

      {/* Themes */}
      {themes.length > 0 && (
        <div className="nudge-card rounded-2xl p-6">
          <h2 className="font-black text-brand-dark mb-1">🧠 What peers said</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Open-text feedback clustered into themes. No raw quotes are attributed.
          </p>
          <div className="space-y-3">
            {themes.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-card-border bg-brand-cream/60 p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm font-bold text-brand-dark">{t.name}</div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">
                    {t.count} mention{t.count === 1 ? '' : 's'}
                  </span>
                </div>
                {t.sample && (
                  <div className="text-xs text-muted-foreground italic leading-relaxed">
                    “{t.sample}”
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Self comment recap */}
      {selfComments && (
        <div className="nudge-card rounded-2xl p-6">
          <h2 className="font-black text-brand-dark mb-1">📝 What you said about yourself</h2>
          <p className="text-sm text-muted-foreground italic leading-relaxed mt-3">
            “{selfComments}”
          </p>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="nudge-card rounded-2xl p-6">
          <h2 className="font-black text-brand-dark mb-3">📜 Round history</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.round_number}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-brand-cream/60"
              >
                <div className="text-sm font-bold text-brand-dark">Round {h.round_number}</div>
                <div className="text-[11px] text-muted-foreground">
                  Self {h.self_avg.toFixed(1)} · Peers {h.peer_avg.toFixed(1)}
                  {h.closed_at && ` · ${new Date(h.closed_at).toLocaleDateString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground">
        Action plan generation drops in Phase 9 — your highest-leverage dimension above is
        what we&apos;ll build it from.
      </p>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Stat({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: 'purple' | 'green' | 'red'
}) {
  const color =
    tone === 'green' ? 'text-brand-green' : tone === 'red' ? 'text-brand-red' : 'text-brand-yellow'
  return (
    <div className="bg-white/10 rounded-xl p-4 text-center">
      <div className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-white/60 mt-1 uppercase tracking-wide font-bold">
        {label}
      </div>
    </div>
  )
}

function DimensionBar({ row }: { row: DimensionRow }) {
  const gapColor =
    row.gap < -1
      ? 'text-brand-red'
      : row.gap < -0.3
        ? 'text-brand-orange'
        : row.gap > 0.3
          ? 'text-brand-green'
          : 'text-muted-foreground'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-brand-dark">{row.name}</span>
        <span className={`text-sm font-black ${gapColor}`}>
          {row.gap > 0 ? '+' : ''}
          {row.gap.toFixed(1)}
        </span>
      </div>
      <BarRow label="You" value={row.self} fill="bg-brand-purple" />
      <BarRow label="Team" value={row.peer} fill="bg-brand-green" />
      {row.count === 0 && (
        <div className="text-[10px] text-muted-foreground mt-1">No peer data on this dimension</div>
      )}
    </div>
  )
}

function BarRow({
  label,
  value,
  fill,
}: {
  label: string
  value: number
  fill: string
}) {
  return (
    <div className="flex items-center gap-3 mb-1.5">
      <span className="w-12 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-brand-cream overflow-hidden">
        <div
          className={`h-full ${fill} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(2, (value / 5) * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-extrabold text-brand-dark">
        {value > 0 ? value.toFixed(1) : '—'}
      </span>
    </div>
  )
}
