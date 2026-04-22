'use client'
// src/components/hr/HRInsightsDashboard.tsx
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface KPIs {
  participants: number
  activeSkills: number
  rcRounds:     number
  avgGrowth:    number
}

interface Props {
  kpis:         KPIs
  insights:     any[]
  topSkillData: any[]
}

const MOCK_CHART = [
  { month: 'Nov', score: 2.8 },
  { month: 'Dec', score: 3.0 },
  { month: 'Jan', score: 3.2 },
  { month: 'Feb', score: 3.5 },
  { month: 'Mar', score: 3.6 },
  { month: 'Apr', score: 3.9 },
]

function KPITile({ label, value, icon, delta }: { label: string; value: string | number; icon: string; delta?: string }) {
  return (
    <div className="nudge-card rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {delta && (
          <span className="text-[10px] font-bold text-brand-green bg-brand-green/10 rounded-full px-2 py-0.5">
            {delta}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-brand-dark">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5 font-semibold">{label}</div>
    </div>
  )
}

function SkillCard({ insight }: { insight: any }) {
  const skill     = insight.skill ?? {}
  const themes    = (insight.top_themes ?? []).slice(0, 3)
  const maxTheme  = Math.max(...themes.map((t: any) => t.volume ?? 0), 1)

  return (
    <div className="nudge-card rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{skill.icon ?? '🧠'}</span>
          <div>
            <div className="font-bold text-sm text-brand-dark">{skill.name ?? 'Skill'}</div>
            <div className="text-[10px] text-muted-foreground">
              {insight.volume ?? 0} convos · {insight.unique_askers ?? 0} users
            </div>
          </div>
        </div>
        {insight.avg_peer_score != null && (
          <div className="text-right">
            <div className="text-xl font-black text-brand-dark">{Number(insight.avg_peer_score).toFixed(1)}</div>
            <div className="text-[9px] text-muted-foreground font-semibold uppercase">Avg score</div>
          </div>
        )}
      </div>

      {/* Mini bar chart */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_CHART} barSize={10}>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#8A8090' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 5]} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(34,29,35,0.1)', padding: '4px 10px' }}
              formatter={(v: number) => [v.toFixed(1), 'Avg peer']}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {MOCK_CHART.map((_, i) => (
                <Cell key={i} fill={i === MOCK_CHART.length - 1 ? '#623CEA' : 'rgba(98,60,234,0.2)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Themes */}
      {themes.length > 0 && (
        <div>
          <div className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Top Themes</div>
          {themes.map((t: any, i: number) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                <span className="text-brand-dark">{t.name}</span>
                <span className="text-muted-foreground">{t.volume}</span>
              </div>
              <div className="h-[4px] bg-brand-purple/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(t.volume / maxTheme) * 100}%`,
                    background: 'linear-gradient(90deg, #623CEA, #F68A29)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HR Action */}
      {insight.recommended_hr_action && (
        <div className="bg-gradient-to-br from-[#FFF8DC] to-[#FFE9B0] border-[1.5px] border-brand-yellow rounded-xl p-3">
          <div className="text-[9px] font-black uppercase tracking-wide text-brand-dark mb-1">💡 Recommended Action</div>
          <div className="text-[11px] font-semibold text-brand-dark leading-relaxed">
            {insight.recommended_hr_action}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HRInsightsDashboard({ kpis, insights, topSkillData }: Props) {
  const [tab, setTab] = useState<'overview' | 'skills' | 'people'>('overview')

  const topScorers = [...topSkillData].sort((a, b) => (b.current_peer ?? 0) - (a.current_peer ?? 0)).slice(0, 5)
  const topGrowers = [...topSkillData].sort((a, b) => (b.peer_growth ?? 0) - (a.peer_growth ?? 0)).slice(0, 5)

  return (
    <div>
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPITile icon="👥" label="Active participants"    value={kpis.participants}              delta="+3 this week" />
        <KPITile icon="🧠" label="Skills in progress"    value={kpis.activeSkills}              />
        <KPITile icon="🔄" label="RC rounds completed"   value={kpis.rcRounds}                  delta="+2 this week" />
        <KPITile icon="📈" label="Avg growth score"      value={`+${kpis.avgGrowth.toFixed(1)}`} delta="↑ 0.1 vs last mo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-card-border">
        {(['overview', 'skills', 'people'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold capitalize transition-all border-b-2 -mb-px ${
              tab === t
                ? 'border-brand-purple text-brand-purple'
                : 'border-transparent text-muted-foreground hover:text-brand-dark'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top scorers */}
          <div className="nudge-card rounded-xl p-5">
            <div className="font-bold text-sm mb-4 flex items-center gap-2">
              <span>🏆</span> Top Scorers
            </div>
            {topScorers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topScorers.map((us, i) => (
                  <div key={us.id} className="flex items-center gap-3">
                    <span className="text-sm font-black text-muted-foreground w-5">#{i + 1}</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: us.user?.avatar_color ?? '#623CEA' }}
                    >
                      {us.user?.avatar_emoji ?? '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{us.user?.name}</div>
                      <div className="text-[10px] text-muted-foreground">{us.skill?.name}</div>
                    </div>
                    <span className="text-sm font-black text-brand-dark">
                      {Number(us.current_peer).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top growers */}
          <div className="nudge-card rounded-xl p-5">
            <div className="font-bold text-sm mb-4 flex items-center gap-2">
              <span>🚀</span> Top Growers
            </div>
            {topGrowers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topGrowers.map((us, i) => (
                  <div key={us.id} className="flex items-center gap-3">
                    <span className="text-sm font-black text-muted-foreground w-5">#{i + 1}</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: us.user?.avatar_color ?? '#623CEA' }}
                    >
                      {us.user?.avatar_emoji ?? '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{us.user?.name}</div>
                      <div className="text-[10px] text-muted-foreground">{us.skill?.name}</div>
                    </div>
                    <span className="text-sm font-black text-brand-green">
                      +{Number(us.peer_growth ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {insights.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
              No skill insights yet. They generate nightly once participants complete rounds.
            </div>
          ) : (
            insights.map(ins => <SkillCard key={ins.id} insight={ins} />)
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="nudge-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                {['Participant', 'Skill', 'Phase', 'Peer Score', 'Growth', 'Surveys'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topSkillData.slice(0, 20).map(us => (
                <tr key={us.id} className="border-b border-card-border/50 hover:bg-brand-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                           style={{ background: us.user?.avatar_color ?? '#623CEA' }}>
                        {us.user?.avatar_emoji ?? '👤'}
                      </div>
                      <span className="text-xs font-semibold">{us.user?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{us.skill?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`phase-badge phase-badge-${us.phase}`}>{us.phase}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold">
                    {us.current_peer != null ? Number(us.current_peer).toFixed(1) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold">
                    <span className={us.peer_growth > 0 ? 'text-brand-green' : us.peer_growth < 0 ? 'text-brand-red' : 'text-muted-foreground'}>
                      {us.peer_growth != null ? `${us.peer_growth > 0 ? '+' : ''}${Number(us.peer_growth).toFixed(1)}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {us.surveys_filled}/{us.surveys_sent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
