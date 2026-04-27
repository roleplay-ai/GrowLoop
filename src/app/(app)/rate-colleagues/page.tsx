// src/app/(app)/rate-colleagues/page.tsx

import { createClient, createServiceClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import type { Metadata } from 'next'
import type { SkillDimension } from '@/lib/types'
import RateColleaguesClient, {
  type ConnectionDTO,
  type PendingDTO,
  type HistoryEntryDTO,
} from '@/components/rate-colleagues/RateColleaguesClient'

export const metadata: Metadata = { title: 'Rate Colleagues' }

export default async function RateColleaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = await createServiceClient()

  // Step 1: get current user's email from users table.
  const { data: me } = await service
    .from('users')
    .select('id, email')
    .eq('id', user!.id)
    .single()

  let pending: PendingDTO[] = []
  let connections: ConnectionDTO[] = []
  let ratingHistory: HistoryEntryDTO[] = []

  if (me?.email) {
    // Step 2: fetch all peer_invites addressed to me.
    const { data: inviteRows, error: invErr } = await service
      .from('peer_invites')
      .select('id, token, status, reality_check_id')
      .eq('peer_email', me.email.toLowerCase())
      .order('sent_at', { ascending: false })

    if (invErr) console.error('[rate-colleagues] invite fetch:', invErr)

    const invites = inviteRows ?? []

    if (invites.length > 0) {
      // Step 3: fetch the rounds for those invites to get user_skill_ids.
      const roundIds = [...new Set(invites.map((i) => i.reality_check_id).filter(Boolean))]

      const { data: rounds } = await service
        .from('reality_check_rounds')
        .select('id, user_skill_id')
        .in('id', roundIds)

      const roundMap = Object.fromEntries((rounds ?? []).map((r) => [r.id, r.user_skill_id]))

      // Step 4: fetch user_skills to get user_id + skill_id.
      const userSkillIds = [...new Set(Object.values(roundMap).filter(Boolean) as string[])]

      const { data: userSkills } = await service
        .from('user_skills')
        .select('id, user_id, skill_id')
        .in('id', userSkillIds)

      const userSkillMap = Object.fromEntries(
        (userSkills ?? []).map((us) => [us.id, { userId: us.user_id, skillId: us.skill_id }]),
      )

      // Step 5: resolve unique user_ids and skill_ids.
      const userIds = [...new Set((userSkills ?? []).map((us) => us.user_id).filter(Boolean) as string[])]
      const skillIds = [...new Set((userSkills ?? []).map((us) => us.skill_id).filter(Boolean) as string[])]

      const [{ data: usersData }, { data: skillsData }] = await Promise.all([
        service
          .from('users')
          .select('id, name, avatar_emoji, avatar_color')
          .in('id', userIds),
        service
          .from('skills')
          .select('id, name, icon, dimensions')
          .in('id', skillIds),
      ])

      const usersMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
      const skillsMap = Object.fromEntries((skillsData ?? []).map((s) => [s.id, s]))

      // Step 6: enrich invites with ratee + skill data.
      type EnrichedInvite = {
        id: string
        token: string
        status: string
        rateeId: string
        rateeName: string
        rateeEmoji: string | null
        rateeColor: string
        skillId: string
        skillName: string
        skillIcon: string
        dimensions: SkillDimension[]
      }

      const enriched: EnrichedInvite[] = []
      for (const inv of invites) {
        const userSkillId = roundMap[inv.reality_check_id]
        if (!userSkillId) continue
        const us = userSkillMap[userSkillId]
        if (!us?.userId || !us?.skillId) continue
        const ratee = usersMap[us.userId]
        const skill = skillsMap[us.skillId]
        if (!ratee || !skill) continue
        enriched.push({
          id: inv.id,
          token: inv.token,
          status: inv.status,
          rateeId: ratee.id,
          rateeName: ratee.name,
          rateeEmoji: ratee.avatar_emoji,
          rateeColor: ratee.avatar_color ?? '#623CEA',
          skillId: skill.id,
          skillName: skill.name,
          skillIcon: skill.icon ?? '🧠',
          dimensions: (skill.dimensions ?? []) as SkillDimension[],
        })
      }

      // Build pending list.
      pending = enriched
        .filter((e) => e.status === 'pending')
        .map((e) => ({
          inviteId: e.id,
          token: e.token,
          rateeId: e.rateeId,
          rateeName: e.rateeName,
          rateeEmoji: e.rateeEmoji,
          rateeColor: e.rateeColor,
          skillName: e.skillName,
          skillIcon: e.skillIcon,
        }))

      // Build peer-survey history from submitted invites.
      const submittedEnriched = enriched.filter((e) => e.status === 'submitted')
      if (submittedEnriched.length > 0) {
        const { data: peerRatings } = await service
          .from('peer_ratings')
          .select('peer_invite_id, ratings, comments, created_at')
          .in('peer_invite_id', submittedEnriched.map((e) => e.id))

        const prMap = Object.fromEntries(
          (peerRatings ?? []).map((r) => [r.peer_invite_id, r]),
        )

        const surveyHistory: HistoryEntryDTO[] = submittedEnriched.map((e) => {
          const pr = prMap[e.id]
          const ratingsMap = (pr?.ratings ?? {}) as Record<string, number>
          const vals = Object.values(ratingsMap)
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          return {
            id: e.id,
            rateeId: e.rateeId,
            rateeName: e.rateeName,
            rateeEmoji: e.rateeEmoji,
            rateeColor: e.rateeColor,
            skillId: e.skillId,
            skillName: e.skillName,
            skillIcon: e.skillIcon,
            avg,
            comments: pr?.comments ?? null,
            createdAt: pr?.created_at ?? new Date().toISOString(),
            superseded: false,
            source: 'peer_survey' as const,
          }
        })
        ratingHistory = [...surveyHistory, ...ratingHistory]
      }

      // Build connections: one entry per unique ratee (union of their skills).
      const connectionMap: Record<string, ConnectionDTO> = {}
      for (const e of enriched) {
        if (!connectionMap[e.rateeId]) {
          connectionMap[e.rateeId] = {
            userId: e.rateeId,
            name: e.rateeName,
            avatarEmoji: e.rateeEmoji,
            avatarColor: e.rateeColor,
            skills: [],
          }
        }
        const conn = connectionMap[e.rateeId]
        if (!conn.skills.some((s) => s.skillId === e.skillId)) {
          conn.skills.push({
            skillId: e.skillId,
            skillName: e.skillName,
            skillIcon: e.skillIcon,
            dimensions: e.dimensions,
          })
        }
      }
      connections = Object.values(connectionMap)
    }

    // Step 7: rating history (voluntary colleague_ratings).
    try {
      const { data: histRows } = await service
        .from('colleague_ratings')
        .select('id, ratee_id, skill_id, ratings, comments, created_at')
        .eq('rater_id', me.id)
        .order('created_at', { ascending: false })

      if (histRows && histRows.length > 0) {
        const histUserIds = [...new Set(histRows.map((r) => r.ratee_id))]
        const histSkillIds = [...new Set(histRows.map((r) => r.skill_id))]

        const [{ data: hUsers }, { data: hSkills }] = await Promise.all([
          service.from('users').select('id, name, avatar_emoji, avatar_color').in('id', histUserIds),
          service.from('skills').select('id, name, icon').in('id', histSkillIds),
        ])

        const hUsersMap = Object.fromEntries((hUsers ?? []).map((u) => [u.id, u]))
        const hSkillsMap = Object.fromEntries((hSkills ?? []).map((s) => [s.id, s]))

        const seen = new Set<string>()
        ratingHistory = histRows.map((r) => {
          const ratee = hUsersMap[r.ratee_id]
          const skill = hSkillsMap[r.skill_id]
          const key = `${r.ratee_id}::${r.skill_id}`
          const superseded = seen.has(key)
          seen.add(key)
          const ratingsMap = r.ratings as Record<string, number>
          const vals = Object.values(ratingsMap)
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          return {
            id: r.id,
            rateeId: r.ratee_id,
            rateeName: ratee?.name ?? 'Unknown',
            rateeEmoji: ratee?.avatar_emoji ?? null,
            rateeColor: ratee?.avatar_color ?? '#623CEA',
            skillId: r.skill_id,
            skillName: skill?.name ?? 'Unknown skill',
            skillIcon: skill?.icon ?? '🧠',
            avg,
            comments: r.comments ?? null,
            createdAt: r.created_at,
            superseded,
          }
        })
      }
    } catch {
      ratingHistory = []
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="⭐ Rate Colleagues" />
      <main className="flex-1 overflow-y-auto p-6">
        <RateColleaguesClient
          pending={pending}
          connections={connections}
          ratingHistory={ratingHistory}
        />
      </main>
    </div>
  )
}
