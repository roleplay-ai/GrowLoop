'use client'
// src/components/super-admin/SkillsLibrary.tsx
import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Archive,
  ArchiveRestore,
  Copy,
  Layers,
  Building2,
  Users as UsersIcon,
  Sparkles,
} from 'lucide-react'
import SkillEditorModal from '@/components/skills/SkillEditorModal'
import {
  createPlatformSkill,
  updatePlatformSkill,
  archivePlatformSkill,
  duplicatePlatformSkill,
} from '@/app/(super-admin)/admin-skills/actions'

interface SkillRow {
  id: string
  name: string
  icon: string | null
  description: string | null
  dimensions: any[] | null
  is_archived: boolean
  created_at: string
  org_clones: number
  active_users: number
}

type Filter = 'active' | 'archived'

export default function SkillsLibrary({ skills }: { skills: SkillRow[] }) {
  const [filter, setFilter] = useState<Filter>('active')
  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<SkillRow | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return skills
      .filter((s) => (filter === 'active' ? !s.is_archived : s.is_archived))
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      )
  }, [skills, filter, query])

  const counts = useMemo(
    () => ({
      active: skills.filter((s) => !s.is_archived).length,
      archived: skills.filter((s) => s.is_archived).length,
    }),
    [skills],
  )

  const totalDimensions = useMemo(
    () => skills.reduce((sum, s) => sum + (s.dimensions?.length ?? 0), 0),
    [skills],
  )

  function openCreate() {
    setEditing(null)
    setEditorOpen(true)
  }
  function openEdit(s: SkillRow) {
    setEditing(s)
    setEditorOpen(true)
  }

  async function handleArchive(s: SkillRow) {
    const next = !s.is_archived
    const verb = next ? 'archive' : 'restore'
    if (!confirm(`${verb[0].toUpperCase() + verb.slice(1)} "${s.name}"?`)) return
    setPendingId(s.id)
    const res = await archivePlatformSkill(s.id, next)
    setPendingId(null)
    if (!res.success) alert(res.error ?? `Failed to ${verb}`)
  }

  async function handleDuplicate(s: SkillRow) {
    setPendingId(s.id)
    const res = await duplicatePlatformSkill(s.id)
    setPendingId(null)
    if (!res.success) alert(res.error ?? 'Failed to duplicate')
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Sparkles className="w-4 h-4" />}
          label="Active skills"
          value={counts.active}
          tint="text-brand-purple bg-brand-purple/10"
        />
        <StatCard
          icon={<Layers className="w-4 h-4" />}
          label="Total dimensions"
          value={totalDimensions}
          tint="text-brand-orange bg-brand-orange/10"
        />
        <StatCard
          icon={<Building2 className="w-4 h-4" />}
          label="Org clones"
          value={skills.reduce((s, x) => s + x.org_clones, 0)}
          tint="text-brand-green bg-brand-green/10"
        />
        <StatCard
          icon={<UsersIcon className="w-4 h-4" />}
          label="Participants using"
          value={skills.reduce((s, x) => s + x.active_users, 0)}
          tint="text-brand-yellow bg-brand-yellow/15"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex bg-white border border-card-border rounded-lg p-1 self-start">
          {(['active', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all ${
                filter === f
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-muted-foreground hover:text-brand-dark'
              }`}
            >
              {f === 'active' ? 'Active' : 'Archived'}
              <span
                className={`ml-2 text-[10px] font-mono ${
                  filter === f ? 'text-white/60' : 'text-muted-foreground/60'
                }`}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
          />
        </div>

        <button
          onClick={openCreate}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          New skill
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="nudge-card rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-cream mx-auto mb-3 flex items-center justify-center text-2xl">
            🧠
          </div>
          <h3 className="text-sm font-bold text-brand-dark mb-1">
            {filter === 'active' ? 'No skills yet' : 'No archived skills'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
            {filter === 'active'
              ? 'Platform skills are the catalogue every org sees. Create one to get started.'
              : 'Skills you archive will show up here.'}
          </p>
          {filter === 'active' && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first skill
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SkillCard
              key={s.id}
              skill={s}
              pending={pendingId === s.id}
              onEdit={() => openEdit(s)}
              onArchive={() => handleArchive(s)}
              onDuplicate={() => handleDuplicate(s)}
            />
          ))}
        </div>
      )}

      {/* Editor */}
      <SkillEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        skill={editing ?? undefined}
        title={editing ? `Edit "${editing.name}"` : 'Create platform skill'}
        subtitle={
          editing
            ? 'Updates apply across all orgs that haven\'t cloned this skill.'
            : 'Platform skills appear in every org\'s catalogue.'
        }
        submitLabel={editing ? 'Save changes' : 'Create skill'}
        onSubmit={async (fd) =>
          editing ? updatePlatformSkill(editing.id, fd) : createPlatformSkill(fd)
        }
      />
    </div>
  )
}

function StatCard({
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

function SkillCard({
  skill,
  pending,
  onEdit,
  onArchive,
  onDuplicate,
}: {
  skill: SkillRow
  pending: boolean
  onEdit: () => void
  onArchive: () => void
  onDuplicate: () => void
}) {
  const dimCount = skill.dimensions?.length ?? 0
  return (
    <div
      className={`nudge-card rounded-xl p-4 flex flex-col gap-3 transition-all ${
        pending ? 'opacity-50 pointer-events-none' : 'hover:shadow-card-hover'
      } ${skill.is_archived ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-brand-cream border border-card-border flex items-center justify-center text-2xl flex-shrink-0">
          {skill.icon ?? '🧠'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-brand-dark truncate">{skill.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {skill.description?.trim() || (
              <span className="italic text-muted-foreground/50">No description</span>
            )}
          </p>
        </div>
        {skill.is_archived && (
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-card-border flex-shrink-0">
            Archived
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-card-border pt-2.5">
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {dimCount} dim
        </div>
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {skill.org_clones} clone{skill.org_clones === 1 ? '' : 's'}
        </div>
        <div className="flex items-center gap-1">
          <UsersIcon className="w-3 h-3" />
          {skill.active_users} user{skill.active_users === 1 ? '' : 's'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold text-brand-dark border border-card-border hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={onDuplicate}
          className="px-2 py-1.5 rounded-md text-[11px] font-bold text-brand-dark border border-card-border hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-colors"
          title="Duplicate"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={onArchive}
          className={`px-2 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
            skill.is_archived
              ? 'text-brand-green border-brand-green/30 hover:bg-brand-green/5'
              : 'text-muted-foreground border-card-border hover:border-brand-red/30 hover:text-brand-red hover:bg-brand-red/5'
          }`}
          title={skill.is_archived ? 'Restore' : 'Archive'}
        >
          {skill.is_archived ? (
            <ArchiveRestore className="w-3 h-3" />
          ) : (
            <Archive className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  )
}
