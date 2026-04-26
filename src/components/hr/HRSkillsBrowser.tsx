'use client'
// src/components/hr/HRSkillsBrowser.tsx
import { useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Copy,
  Layers,
  Sparkles,
  Building2,
  Eye,
} from 'lucide-react'
import SkillEditorModal from '@/components/skills/SkillEditorModal'
import {
  cloneSkillToOrg,
  createOrgSkill,
  updateOrgSkill,
  archiveOrgSkill,
} from '@/app/(hr)/hr-skills/actions'

interface PlatformSkill {
  id: string
  name: string
  icon: string | null
  description: string | null
  dimensions: any[] | null
}

interface OrgSkill {
  id: string
  name: string
  icon: string | null
  description: string | null
  dimensions: any[] | null
  is_archived: boolean
  active_users: number
  created_at: string
}

type Tab = 'platform' | 'org'

export default function HRSkillsBrowser({
  platform,
  orgSkills,
}: {
  platform: PlatformSkill[]
  orgSkills: OrgSkill[]
}) {
  const [tab, setTab] = useState<Tab>('platform')
  const [query, setQuery] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<OrgSkill | null>(null)
  const [viewer, setViewer] = useState<PlatformSkill | null>(null)
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null)

  const filteredPlatform = useMemo(() => {
    const q = query.trim().toLowerCase()
    return platform.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    )
  }, [platform, query])

  const filteredOrg = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orgSkills.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    )
  }, [orgSkills, query])

  async function handleClone(s: PlatformSkill) {
    if (
      !confirm(`Clone "${s.name}" to your org's catalogue? You'll be able to customise it.`)
    )
      return
    setPendingId(s.id)
    const res = await cloneSkillToOrg(s.id)
    setPendingId(null)
    if (!res.success) {
      alert(res.error ?? 'Failed to clone')
      return
    }
    setCloneSuccess(s.name)
    setTimeout(() => setCloneSuccess(null), 3000)
    setTab('org')
  }

  async function handleArchiveOrg(s: OrgSkill) {
    const next = !s.is_archived
    if (!confirm(`${next ? 'Archive' : 'Restore'} "${s.name}"?`)) return
    setPendingId(s.id)
    const res = await archiveOrgSkill(s.id, next)
    setPendingId(null)
    if (!res.success) alert(res.error ?? 'Failed')
  }

  function openEdit(s: OrgSkill) {
    setEditing(s)
    setEditorOpen(true)
  }
  function openCreate() {
    setEditing(null)
    setEditorOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Clone success toast */}
      {cloneSuccess && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-semibold">
          <span className="text-base">✓</span>
          <span>"{cloneSuccess}" cloned to Your Skills — you can now edit and assign it.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat
          icon={<Sparkles className="w-4 h-4" />}
          label="Platform skills"
          value={platform.length}
          tint="text-brand-purple bg-brand-purple/10"
        />
        <Stat
          icon={<Building2 className="w-4 h-4" />}
          label="Custom skills"
          value={orgSkills.filter((s) => !s.is_archived).length}
          tint="text-brand-orange bg-brand-orange/10"
        />
        <Stat
          icon={<Layers className="w-4 h-4" />}
          label="Active learners"
          value={orgSkills.reduce((s, x) => s + x.active_users, 0)}
          tint="text-brand-yellow bg-brand-yellow/15"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex bg-white border border-card-border rounded-lg p-1 self-start">
          <button
            onClick={() => setTab('platform')}
            className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all ${
              tab === 'platform'
                ? 'bg-brand-dark text-white shadow-sm'
                : 'text-muted-foreground hover:text-brand-dark'
            }`}
          >
            Platform Catalogue
            <span
              className={`ml-2 text-[10px] font-mono ${
                tab === 'platform' ? 'text-white/60' : 'text-muted-foreground/60'
              }`}
            >
              {platform.length}
            </span>
          </button>
          <button
            onClick={() => setTab('org')}
            className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all ${
              tab === 'org'
                ? 'bg-brand-dark text-white shadow-sm'
                : 'text-muted-foreground hover:text-brand-dark'
            }`}
          >
            Our Skills
            <span
              className={`ml-2 text-[10px] font-mono ${
                tab === 'org' ? 'text-white/60' : 'text-muted-foreground/60'
              }`}
            >
              {orgSkills.length}
            </span>
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'platform' ? 'Search the platform catalogue…' : 'Search your skills…'}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
          />
        </div>

        {tab === 'org' && (
          <button
            onClick={openCreate}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 active:scale-95 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            New custom skill
          </button>
        )}
      </div>

      {/* Lists */}
      {tab === 'platform' ? (
        <PlatformList
          skills={filteredPlatform}
          pendingId={pendingId}
          onClone={handleClone}
          onView={(s) => setViewer(s)}
        />
      ) : (
        <OrgList
          skills={filteredOrg}
          pendingId={pendingId}
          onEdit={openEdit}
          onArchive={handleArchiveOrg}
        />
      )}

      {/* Editor for org skills */}
      <SkillEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        skill={editing ?? undefined}
        title={editing ? `Edit "${editing.name}"` : 'Create custom skill'}
        subtitle={
          editing
            ? 'These changes only apply to your organisation.'
            : 'Build a skill from scratch tailored to your org.'
        }
        submitLabel={editing ? 'Save changes' : 'Create skill'}
        onSubmit={async (fd) =>
          editing ? updateOrgSkill(editing.id, fd) : createOrgSkill(fd)
        }
      />

      {/* Read-only viewer for platform skills */}
      {viewer && <PlatformSkillViewer skill={viewer} onClose={() => setViewer(null)} />}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tint: string
}) {
  return (
    <div className="nudge-card rounded-xl p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-black text-brand-dark leading-none">{value}</div>
        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] mt-1">
          {label}
        </div>
      </div>
    </div>
  )
}

function PlatformList({
  skills,
  pendingId,
  onClone,
  onView,
}: {
  skills: PlatformSkill[]
  pendingId: string | null
  onClone: (s: PlatformSkill) => void
  onView: (s: PlatformSkill) => void
}) {
  if (skills.length === 0) {
    return <EmptyState message="No platform skills match your search." />
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((s) => (
        <div
          key={s.id}
          className={`nudge-card rounded-xl p-4 flex flex-col gap-3 transition-all ${
            pendingId === s.id ? 'opacity-50 pointer-events-none' : 'hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-brand-cream border border-card-border flex items-center justify-center text-2xl flex-shrink-0">
              {s.icon ?? '🧠'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-brand-dark truncate">{s.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {s.description?.trim() || (
                  <span className="italic text-muted-foreground/50">No description</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-card-border pt-2.5">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {s.dimensions?.length ?? 0} dim
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
              Platform
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => onView(s)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold text-brand-dark border border-card-border hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-colors"
              title="Preview"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => onClone(s)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold text-brand-dark border border-card-border hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-colors"
              title="Clone & customise"
            >
              <Copy className="w-3 h-3" />
              Clone
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function OrgList({
  skills,
  pendingId,
  onEdit,
  onArchive,
}: {
  skills: OrgSkill[]
  pendingId: string | null
  onEdit: (s: OrgSkill) => void
  onArchive: (s: OrgSkill) => void
}) {
  if (skills.length === 0) {
    return (
      <EmptyState
        message="No custom skills yet"
        hint="Clone a platform skill from the catalogue, or create one from scratch."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((s) => (
        <div
          key={s.id}
          className={`nudge-card rounded-xl p-4 flex flex-col gap-3 transition-all ${
            pendingId === s.id ? 'opacity-50 pointer-events-none' : 'hover:shadow-card-hover'
          } ${s.is_archived ? 'opacity-70' : ''}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-brand-cream border border-card-border flex items-center justify-center text-2xl flex-shrink-0">
              {s.icon ?? '🧠'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-brand-dark truncate">{s.name}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {s.description?.trim() || (
                  <span className="italic text-muted-foreground/50">No description</span>
                )}
              </p>
            </div>
            {s.is_archived && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-card-border flex-shrink-0">
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-card-border pt-2.5">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {s.dimensions?.length ?? 0} dim
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {s.active_users} learner{s.active_users === 1 ? '' : 's'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => onEdit(s)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold text-brand-dark border border-card-border hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => onArchive(s)}
              className={`px-2 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
                s.is_archived
                  ? 'text-brand-green border-brand-green/30 hover:bg-brand-green/5'
                  : 'text-muted-foreground border-card-border hover:border-brand-red/30 hover:text-brand-red hover:bg-brand-red/5'
              }`}
              title={s.is_archived ? 'Restore' : 'Archive'}
            >
              {s.is_archived ? (
                <ArchiveRestore className="w-3 h-3" />
              ) : (
                <Archive className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="nudge-card rounded-xl p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-cream mx-auto mb-3 flex items-center justify-center text-2xl">
        🧠
      </div>
      <h3 className="text-sm font-bold text-brand-dark mb-1">{message}</h3>
      {hint && <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">{hint}</p>}
    </div>
  )
}

function PlatformSkillViewer({
  skill,
  onClose,
}: {
  skill: PlatformSkill
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-card-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-card-border flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-brand-cream border border-card-border flex items-center justify-center text-2xl flex-shrink-0">
            {skill.icon ?? '🧠'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-brand-dark">{skill.name}</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {skill.description ?? 'No description.'}
            </p>
            <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
              Platform · Read-only
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-brand-dark text-xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px]">
            Dimensions ({skill.dimensions?.length ?? 0})
          </h3>
          {(!skill.dimensions || skill.dimensions.length === 0) && (
            <p className="text-xs text-muted-foreground italic">No dimensions defined.</p>
          )}
          {skill.dimensions?.map((d: any, i: number) => (
            <div key={d.id ?? i} className="border border-card-border rounded-xl p-4 bg-brand-cream/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded bg-brand-purple/10 text-brand-purple text-[10px] font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <h4 className="text-sm font-black text-brand-dark">{d.name}</h4>
              </div>
              {d.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{d.description}</p>
              )}
              {d.rubric &&
                Object.values(d.rubric).some((v: any) => (v ?? '').trim()) && (
                  <div className="space-y-1 border-t border-card-border pt-3">
                    {(['1', '2', '3', '4', '5'] as const).map(
                      (lvl) =>
                        d.rubric[lvl]?.trim() && (
                          <div key={lvl} className="flex items-start gap-2 text-xs">
                            <span className="w-5 h-5 rounded bg-brand-yellow/15 text-brand-dark text-[10px] font-black flex items-center justify-center flex-shrink-0">
                              {lvl}
                            </span>
                            <span className="text-brand-dark leading-relaxed">{d.rubric[lvl]}</span>
                          </div>
                        ),
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
