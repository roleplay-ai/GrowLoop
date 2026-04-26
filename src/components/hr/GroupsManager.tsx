'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addParticipantToGroup,
  addParticipantsToGroup,
  setGroupVisibleSkills,
  removeParticipantFromGroup,
} from '@/app/(hr)/groups/actions'
import {
  Users,
  Layers,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
  default_skills?: string[] | null
  group_members: { user_id: string }[]
}

interface Participant {
  id: string
  name: string
  email: string
  avatar_color: string | null
  avatar_emoji: string | null
  title: string | null
}

interface SkillOption {
  id: string
  name: string
  icon?: string | null
  description?: string | null
}

interface Props {
  groups: Group[]
  participants: Participant[]
  enabledSkills: SkillOption[]
}

type ActiveTab = 'members' | 'skills'

type Toast = { message: string; type: 'success' | 'warning' }

export default function GroupsManager({ groups, participants, enabledSkills }: Props) {
  const router = useRouter()

  // Toast
  const [toast, setToast] = useState<Toast | null>(null)

  function showToast(message: string, type: Toast['type'] = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function refreshAfterToast() {
    // Short delay so the toast renders before the server re-fetch
    setTimeout(() => router.refresh(), 800)
  }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [modalName, setModalName] = useState('')
  const [modalDesc, setModalDesc] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSubmitting, setModalSubmitting] = useState(false)

  // Panel state (expanded group)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, ActiveTab>>({})

  // Member add state
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  // Conflict warning state
  const [conflictInfo, setConflictInfo] = useState<{
    groupId: string
    conflicts: { id: string; name: string; fromGroup: string }[]
  } | null>(null)

  // Skills state
  const [skillSearch, setSkillSearch] = useState('')
  const [skillsDraft, setSkillsDraft] = useState<Record<string, string[]>>({})
  const [savingSkillsFor, setSavingSkillsFor] = useState<string | null>(null)

  const participantMap = new Map(participants.map(p => [p.id, p]))

  // Map each userId → which group they currently belong to
  const userGroupMap = new Map<string, string>()
  const groupNameMap = new Map<string, string>()
  for (const g of groups) {
    groupNameMap.set(g.id, g.name)
    for (const m of g.group_members) {
      userGroupMap.set(m.user_id, g.id)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditGroup(null)
    setModalName('')
    setModalDesc('')
    setModalError(null)
    setModalOpen(true)
  }

  function openEdit(group: Group) {
    setEditGroup(group)
    setModalName(group.name)
    setModalDesc(group.description ?? '')
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditGroup(null)
    setModalError(null)
  }

  function toggleExpand(groupId: string) {
    if (expandedId === groupId) {
      setExpandedId(null)
    } else {
      setExpandedId(groupId)
      if (!activeTab[groupId]) {
        setActiveTab(prev => ({ ...prev, [groupId]: 'members' }))
      }
    }
  }

  function getTab(groupId: string): ActiveTab {
    return activeTab[groupId] ?? 'members'
  }

  function setTab(groupId: string, tab: ActiveTab) {
    setActiveTab(prev => ({ ...prev, [groupId]: tab }))
  }

  function getDraftSkills(group: Group): string[] {
    return skillsDraft[group.id] ?? ((group.default_skills ?? []).filter(Boolean) as string[])
  }

  function toggleDraftSkill(groupId: string, skillId: string) {
    setSkillsDraft(prev => {
      const curr = prev[groupId] ?? []
      return {
        ...prev,
        [groupId]: curr.includes(skillId) ? curr.filter(id => id !== skillId) : [...curr, skillId],
      }
    })
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modalName.trim()) return
    setModalSubmitting(true)
    setModalError(null)

    const fd = new FormData()
    fd.set('name', modalName.trim())
    fd.set('description', modalDesc.trim())

    const result = editGroup
      ? await updateGroup(editGroup.id, fd)
      : await createGroup(fd)

    setModalSubmitting(false)
    if (!result.success) {
      setModalError(result.error ?? 'Failed to save group')
      return
    }
    closeModal()
    showToast(editGroup ? 'Group updated successfully' : 'Group created successfully')
    refreshAfterToast()
  }

  async function handleDelete(group: Group) {
    if (!confirm(`Delete "${group.name}"? Members will not be removed.`)) return
    const result = await deleteGroup(group.id)
    if (!result.success) alert(result.error ?? 'Failed to delete group')
    else router.refresh()
  }

  function handleAddMembersClick(groupId: string) {
    if (selectedUserIds.length === 0) return

    // Check if any selected users are already in a different group
    const conflicts = selectedUserIds
      .map(id => {
        const existingGroupId = userGroupMap.get(id)
        if (existingGroupId && existingGroupId !== groupId) {
          const p = participantMap.get(id)
          return {
            id,
            name: p?.name ?? id,
            fromGroup: groupNameMap.get(existingGroupId) ?? 'another group',
          }
        }
        return null
      })
      .filter(Boolean) as { id: string; name: string; fromGroup: string }[]

    if (conflicts.length > 0) {
      setConflictInfo({ groupId, conflicts })
    } else {
      doAddMembers(groupId, selectedUserIds)
    }
  }

  async function doAddMembers(groupId: string, userIds: string[]) {
    setConflictInfo(null)
    const result = await addParticipantsToGroup(groupId, userIds)
    if (!result.success) { showToast(result.error ?? 'Failed to add members', 'warning'); return }
    setAddingToGroup(null)
    setSelectedUserIds([])
    setMemberSearch('')
    const count = (result as any).added ?? userIds.length
    showToast(`${count} participant${count !== 1 ? 's' : ''} added to group`)
    refreshAfterToast()
  }

  async function handleRemoveMember(groupId: string, userId: string) {
    const result = await removeParticipantFromGroup(groupId, userId)
    if (!result.success) alert(result.error ?? 'Failed to remove member')
    else router.refresh()
  }

  async function handleSaveSkills(groupId: string) {
    setSavingSkillsFor(groupId)
    const result = await setGroupVisibleSkills(groupId, skillsDraft[groupId] ?? [])
    setSavingSkillsFor(null)
    if (!result.success) {
      showToast(result.error ?? 'Failed to save skills', 'warning')
      return
    }
    const count = (result as any).skillIds?.length ?? 0
    showToast(`Skills updated — ${count} skill${count !== 1 ? 's' : ''} visible to this group`)
    refreshAfterToast()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">Groups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organise participants and control which skills they can access.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          New Group
        </button>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="nudge-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-brand-purple" />
          </div>
          <h3 className="text-base font-black text-brand-dark mb-1">No groups yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto leading-relaxed">
            Create your first group to organise participants and assign skills.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Group
          </button>
        </div>
      )}

      {/* Groups */}
      <div className="space-y-3">
        {groups.map(group => {
          const memberIds = group.group_members.map(m => m.user_id)
          const members = memberIds.map(id => participantMap.get(id)).filter(Boolean) as Participant[]
          const available = participants.filter(p => !memberIds.includes(p.id))
          const isExpanded = expandedId === group.id
          const tab = getTab(group.id)
          const skillCount = (group.default_skills ?? []).length

          return (
            <div key={group.id} className="nudge-card rounded-2xl overflow-hidden transition-all">
              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-brand-purple" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-black text-brand-dark text-base leading-snug truncate">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {group.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(group)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-brand-purple hover:bg-brand-purple/5 transition-colors"
                          title="Edit group"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(group)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stats + avatars */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-purple bg-brand-purple/10 px-2.5 py-1 rounded-full">
                        <Users className="w-3 h-3" />
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full">
                        <Layers className="w-3 h-3" />
                        {skillCount} skill{skillCount !== 1 ? 's' : ''}
                      </span>

                      {/* Mini avatar strip */}
                      {members.length > 0 && (
                        <div className="flex items-center -space-x-1.5 ml-1">
                          {members.slice(0, 5).map(m => (
                            <div
                              key={m.id}
                              title={m.name}
                              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                              style={{ background: m.avatar_color ?? '#623CEA' }}
                            >
                              {m.avatar_emoji ?? m.name?.slice(0, 1).toUpperCase()}
                            </div>
                          ))}
                          {members.length > 5 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-brand-cream flex items-center justify-center text-[8px] font-black text-muted-foreground">
                              +{members.length - 5}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(group.id)}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-brand-purple hover:text-brand-purple/70 transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-3.5 h-3.5" /> Hide</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" /> Manage</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-card-border bg-brand-cream/30">
                  {/* Tabs */}
                  <div className="flex border-b border-card-border bg-white px-5">
                    {(['members', 'skills'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTab(group.id, t)}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                          tab === t
                            ? 'border-brand-purple text-brand-purple'
                            : 'border-transparent text-muted-foreground hover:text-brand-dark'
                        }`}
                      >
                        {t === 'members' ? `Members (${members.length})` : `Skills (${getDraftSkills(group).length})`}
                      </button>
                    ))}
                  </div>

                  {/* Members tab */}
                  {tab === 'members' && (
                    <div className="p-5 space-y-4">
                      {/* Member list */}
                      {members.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-2">
                            <Users className="w-4 h-4 text-brand-purple" />
                          </div>
                          <p className="text-xs text-muted-foreground">No members yet</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {members.map(m => (
                            <div
                              key={m.id}
                              className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-card-border"
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                                style={{ background: m.avatar_color ?? '#623CEA' }}
                              >
                                {m.avatar_emoji ?? m.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-brand-dark truncate">{m.name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{m.title ?? m.email}</div>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(group.id, m.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                title="Remove from group"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add member flow */}
                      {addingToGroup === group.id ? (
                        <div className="bg-white border border-card-border rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-brand-dark uppercase tracking-wider">
                              Select Participants
                            </span>
                            <span className="text-[10px] font-bold text-brand-purple">
                              {selectedUserIds.length} selected
                            </span>
                          </div>

                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                            <input
                              value={memberSearch}
                              onChange={e => setMemberSearch(e.target.value)}
                              placeholder="Search by name or email…"
                              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-brand-cream/30 text-xs text-brand-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedUserIds(available.map(p => p.id))}
                              className="text-[10px] font-bold text-brand-purple hover:underline"
                            >
                              Select all ({available.length})
                            </button>
                            {selectedUserIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedUserIds([])}
                                className="text-[10px] font-bold text-muted-foreground hover:text-brand-dark"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                            {available
                              .filter(p => {
                                if (!memberSearch.trim()) return true
                                const q = memberSearch.toLowerCase()
                                return (
                                  p.name.toLowerCase().includes(q) ||
                                  p.email.toLowerCase().includes(q)
                                )
                              })
                              .map(p => {
                                const checked = selectedUserIds.includes(p.id)
                                return (
                                  <label
                                    key={p.id}
                                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-brand-cream/40 transition-colors"
                                  >
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          setSelectedUserIds(prev =>
                                            prev.includes(p.id)
                                              ? prev.filter(id => id !== p.id)
                                              : [...prev, p.id],
                                          )
                                        }
                                        className="sr-only"
                                      />
                                      <div
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                          checked
                                            ? 'bg-brand-purple border-brand-purple'
                                            : 'border-border bg-white'
                                        }`}
                                      >
                                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                      </div>
                                    </div>
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                      style={{ background: p.avatar_color ?? '#623CEA' }}
                                    >
                                      {p.avatar_emoji ?? p.name?.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold text-brand-dark truncate">{p.name}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>
                                    </div>
                                  </label>
                                )
                              })}
                            {available.filter(p => {
                              if (!memberSearch.trim()) return true
                              const q = memberSearch.toLowerCase()
                              return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
                            }).length === 0 && (
                              <div className="p-4 text-xs text-muted-foreground text-center">No participants found</div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAddMembersClick(group.id)}
                              disabled={selectedUserIds.length === 0}
                              className="flex-1 px-3 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 disabled:opacity-40 transition-all"
                            >
                              Add {selectedUserIds.length > 0 ? `${selectedUserIds.length} ` : ''}Selected
                            </button>
                            <button
                              onClick={() => {
                                setAddingToGroup(null)
                                setSelectedUserIds([])
                                setMemberSearch('')
                              }}
                              className="px-3 py-2 rounded-lg border border-card-border text-xs font-semibold text-muted-foreground hover:border-brand-dark hover:text-brand-dark transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : available.length > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedUserIds([])
                            setMemberSearch('')
                            setAddingToGroup(group.id)
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-brand-purple border border-dashed border-brand-purple/40 rounded-xl hover:bg-brand-purple/5 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Participant
                        </button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-2">
                          All participants are already in this group.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Skills tab */}
                  {tab === 'skills' && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Select which skills participants in this group can see and enrol in.
                          Leave empty to allow access to all enabled skills.
                        </p>
                        <button
                          onClick={() => handleSaveSkills(group.id)}
                          disabled={savingSkillsFor === group.id}
                          className="flex-shrink-0 px-4 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 disabled:opacity-50 transition-all shadow-sm"
                        >
                          {savingSkillsFor === group.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>

                      {enabledSkills.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-xs text-muted-foreground">No skills available yet.</p>
                        </div>
                      ) : (
                        <>
                          {/* Search + bulk actions */}
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                              <input
                                value={skillSearch}
                                onChange={e => setSkillSearch(e.target.value)}
                                placeholder="Search skills…"
                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-brand-cream/30 text-xs text-brand-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  setSkillsDraft(prev => ({ ...prev, [group.id]: enabledSkills.map(s => s.id) }))
                                }
                                className="text-[10px] font-bold text-brand-purple hover:underline"
                              >
                                Select all ({enabledSkills.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setSkillsDraft(prev => ({ ...prev, [group.id]: [] }))}
                                className="text-[10px] font-bold text-muted-foreground hover:text-brand-dark"
                              >
                                Clear selection
                              </button>
                            </div>
                          </div>

                          {/* Skill list */}
                          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                            {enabledSkills
                              .filter(s => {
                                if (!skillSearch.trim()) return true
                                const q = skillSearch.toLowerCase()
                                return (
                                  s.name.toLowerCase().includes(q) ||
                                  (s.description ?? '').toLowerCase().includes(q)
                                )
                              })
                              .map(s => {
                                const checked = getDraftSkills(group).includes(s.id)
                                return (
                                  <label
                                    key={s.id}
                                    className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                                      checked
                                        ? 'border-brand-purple/40 bg-brand-purple/3'
                                        : 'border-card-border hover:border-brand-purple/20 hover:bg-brand-cream/40'
                                    }`}
                                  >
                                    <div className="relative flex-shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleDraftSkill(group.id, s.id)}
                                        className="sr-only"
                                      />
                                      <div
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                          checked
                                            ? 'bg-brand-purple border-brand-purple'
                                            : 'border-border bg-white'
                                        }`}
                                      >
                                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                      </div>
                                    </div>
                                    <span className="text-xl flex-shrink-0">{s.icon ?? '🧠'}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold text-brand-dark truncate">{s.name}</div>
                                      {s.description && (
                                        <div className="text-[10px] text-muted-foreground truncate">{s.description}</div>
                                      )}
                                    </div>
                                    {checked && (
                                      <span className="text-[9px] font-black text-brand-purple flex-shrink-0">✓</span>
                                    )}
                                  </label>
                                )
                              })}
                          </div>

                          <div className="text-[10px] text-muted-foreground font-mono">
                            {getDraftSkills(group).length} of {enabledSkills.length} selected
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all animate-fade-up ${
            toast.type === 'success'
              ? 'bg-white border-brand-green/30 text-brand-dark'
              : 'bg-white border-red-200 text-brand-dark'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-brand-orange flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Conflict warning modal */}
      {conflictInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-fade-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-card-border overflow-hidden">
            <div className="px-6 py-5 border-b border-card-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-brand-orange" />
              </div>
              <div>
                <h2 className="text-sm font-black text-brand-dark">Already in another group</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">These participants will be moved.</p>
              </div>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-48 overflow-y-auto">
              {conflictInfo.conflicts.map(c => (
                <div key={c.id} className="flex items-center gap-2.5 text-xs">
                  <span className="font-semibold text-brand-dark">{c.name}</span>
                  <span className="text-muted-foreground">→ currently in</span>
                  <span className="font-bold text-brand-orange">{c.fromGroup}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-card-border bg-brand-cream/30 flex gap-2 justify-end">
              <button
                onClick={() => setConflictInfo(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-brand-dark hover:bg-white border border-card-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doAddMembers(conflictInfo.groupId, selectedUserIds)}
                className="px-5 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 transition-all shadow-md"
              >
                Move to this group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-fade-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-card-border overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-brand-purple" />
                </div>
                <div>
                  <h2 className="text-base font-black text-brand-dark">
                    {editGroup ? 'Edit Group' : 'Create New Group'}
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {editGroup ? 'Update the group details below.' : 'Set up a new group for your organisation.'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-brand-cream transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                {modalError && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="font-medium leading-tight">{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-brand-dark mb-1.5 uppercase tracking-[1.5px]">
                    Group Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={modalName}
                    onChange={e => setModalName(e.target.value)}
                    placeholder="e.g. Engineering Team"
                    maxLength={80}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-brand-dark mb-1.5 uppercase tracking-[1.5px]">
                    Description
                    <span className="ml-1 font-normal text-muted-foreground normal-case tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={modalDesc}
                    onChange={e => setModalDesc(e.target.value)}
                    placeholder="A short note about this group's purpose…"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-brand-dark placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all resize-none"
                  />
                  <div className="text-right text-[10px] text-muted-foreground/50 font-mono mt-1">
                    {modalDesc.length} / 500
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-card-border bg-brand-cream/30 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-brand-dark hover:bg-white transition-colors"
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !modalName.trim()}
                  className="px-5 py-2 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 active:scale-95 transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
                >
                  {modalSubmitting && (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {modalSubmitting ? 'Saving…' : editGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
