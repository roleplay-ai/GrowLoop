// src/lib/reality-check/helpers.ts
//
// Pure helpers shared between the RC API routes, the orchestrator UI,
// and the results page. No Supabase-specific code lives here so the
// functions stay easy to unit-test.

import type { SkillDimension } from '@/lib/types'

export type Ratings = Record<string, number> // { [dimensionId]: 1-5 }

export interface PeerAggregate {
  /** Per-dimension average across all peer ratings. */
  dimensions: Record<string, { avg: number; count: number }>
  /** Mean of all per-dimension averages (overall peer score). */
  overall: number
}

/**
 * Aggregate a list of peer rating maps into per-dimension averages plus an
 * overall mean. Dimensions that received zero ratings get { avg: 0, count: 0 }.
 */
export function aggregatePeerRatings(
  dimensions: SkillDimension[],
  ratingsList: Ratings[],
): PeerAggregate {
  const out: Record<string, { avg: number; count: number }> = {}

  for (const d of dimensions) {
    let sum = 0
    let count = 0
    for (const r of ratingsList) {
      const v = Number(r?.[d.id])
      if (Number.isFinite(v) && v >= 1 && v <= 5) {
        sum += v
        count += 1
      }
    }
    out[d.id] = count > 0 ? { avg: round2(sum / count), count } : { avg: 0, count: 0 }
  }

  const dimsWithData = Object.values(out).filter((x) => x.count > 0)
  const overall =
    dimsWithData.length > 0
      ? round2(dimsWithData.reduce((a, b) => a + b.avg, 0) / dimsWithData.length)
      : 0

  return { dimensions: out, overall }
}

/** Mean of all dimension self-ratings (1-5 scale). */
export function selfAverage(dimensions: SkillDimension[], ratings: Ratings | null | undefined): number {
  if (!ratings) return 0
  const vals: number[] = []
  for (const d of dimensions) {
    const v = Number(ratings[d.id])
    if (Number.isFinite(v) && v >= 1 && v <= 5) vals.push(v)
  }
  if (!vals.length) return 0
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * For each dimension build a row with self vs peer for the results UI.
 * Sorted by gap ascending (most negative first → biggest blind spots).
 */
export interface DimensionRow {
  id: string
  name: string
  self: number
  peer: number
  gap: number // peer - self
  count: number // peer rating count
}

export function buildDimensionRows(
  dimensions: SkillDimension[],
  selfRatings: Ratings | null | undefined,
  peerAgg: PeerAggregate | null,
): DimensionRow[] {
  const rows: DimensionRow[] = dimensions.map((d) => {
    const self = Number(selfRatings?.[d.id]) || 0
    const peer = peerAgg?.dimensions[d.id]?.avg ?? 0
    const count = peerAgg?.dimensions[d.id]?.count ?? 0
    return {
      id: d.id,
      name: d.name,
      self,
      peer,
      gap: round2(peer - self),
      count,
    }
  })
  return rows.sort((a, b) => a.gap - b.gap)
}

/** Human label for the four peer-relation values used across the UI. */
export const RELATION_LABELS: Record<string, string> = {
  manager: 'Manager',
  peer: 'Peer',
  report: 'Direct report',
  cross_fn: 'Cross-functional',
}

export const RELATION_OPTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'manager', label: 'Manager', emoji: '👩‍💼' },
  { value: 'peer', label: 'Peer', emoji: '🧑' },
  { value: 'report', label: 'Direct report', emoji: '👨' },
  { value: 'cross_fn', label: 'Cross-functional', emoji: '🧔' },
]

/** RC round is closeable when self-rating is filled AND ≥ 3 peers responded
 *  (or 14 days have elapsed since the round started — fallback). */
export function canCloseRound(args: {
  selfRatings: Ratings | null | undefined
  peerResponseCount: number
  startedAt: string
}): { ok: boolean; reason?: string } {
  const hasSelf = !!args.selfRatings && Object.keys(args.selfRatings).length > 0
  if (!hasSelf) return { ok: false, reason: 'Add your self-rating first.' }

  if (args.peerResponseCount >= 3) return { ok: true }

  const ageMs = Date.now() - new Date(args.startedAt).getTime()
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000
  if (ageMs >= FOURTEEN_DAYS) return { ok: true, reason: 'Closing on 14-day timeout' }

  return {
    ok: false,
    reason: `Need at least 3 peer responses (have ${args.peerResponseCount}) or wait 14 days.`,
  }
}
