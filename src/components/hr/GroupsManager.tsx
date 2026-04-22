'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addParticipantToGroup,
  removeParticipantFromGroup,
} from '@/app/(hr)/groups/actions'

interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
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

interface Props {
  groups: Group[]
  participants: Participant[]
}

export default function GroupsManager({ groups, participants }: Props) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participantMap = new Map(participants.map(p => [p.id, p]))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', newName)
    formData.set('description', newDescription)

    const result = await createGroup(formData)

    if (result.success) {
      setIsCreateOpen(false)
      setNewName('')
      setNewDescription('')
      router.refresh()
    } else {
      setError(result.error ?? 'Failed to create group')
    }
    setIsSubmitting(false)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGroup) return
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', newName)
    formData.set('description', newDescription)

    const result = await updateGroup(editGroup.id, formData)

    if (result.success) {
      setEditGroup(null)
      setNewName('')
      setNewDescription('')
      router.refresh()
    } else {
      setError(result.error ?? 'Failed to update group')
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (groupId: string, name: string) => {
    if (!confirm(`Delete group "${name}"? Members will not be deleted.`)) return
    const result = await deleteGroup(groupId)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error ?? 'Failed to delete group')
    }
  }

  const handleAddMember = async (groupId: string) => {
    if (!selectedUserId) return
    const result = await addParticipantToGroup(groupId, selectedUserId)
    if (result.success) {
      setAddingToGroup(null)
      setSelectedUserId('')
      router.refresh()
    } else {
      alert(result.error ?? 'Failed to add member')
    }
  }

  const handleRemoveMember = async (groupId: string, userId: string) => {
    const result = await removeParticipantFromGroup(groupId, userId)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error ?? 'Failed to remove member')
    }
  }

  const openEdit = (group: Group) => {
    setEditGroup(group)
    setNewName(group.name)
    setNewDescription(group.description ?? '')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">Groups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {groups.length} group{groups.length !== 1 ? 's' : ''} · Organize participants for targeted skill assignments
          </p>
        </div>
        <button
          onClick={() => {
            setNewName('')
            setNewDescription('')
            setIsCreateOpen(true)
          }}
          className="px-4 py-2.5 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 transition-colors"
        >
          + New Group
        </button>
      </div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="nudge-card rounded-xl p-12 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <h3 className="text-lg font-bold text-brand-dark mb-2">No groups yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first group to organize participants</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-brand-dark text-white text-xs font-black hover:bg-brand-dark/90 transition-colors"
          >
            + Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(group => {
            const memberIds = group.group_members.map(m => m.user_id)
            const members = memberIds.map(id => participantMap.get(id)).filter(Boolean) as Participant[]
            const available = participants.filter(p => !memberIds.includes(p.id))
            const isExpanded = expandedId === group.id

            return (
              <div key={group.id} className="nudge-card rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-black text-brand-dark text-base">{group.name}</h3>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(group)}
                        className="text-[10px] font-bold text-brand-purple px-2 py-1 rounded hover:bg-brand-purple/5 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
                        className="text-[10px] font-bold text-red-500 px-2 py-1 rounded hover:bg-red-500/5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-purple bg-brand-purple/10 px-2 py-1 rounded">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : group.id)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-brand-dark"
                    >
                      {isExpanded ? '▲ Hide' : '▼ Show members'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-card-border bg-brand-cream/30 p-4">
                    {/* Members list */}
                    <div className="space-y-2 mb-3">
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No members yet</p>
                      ) : (
                        members.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-white rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                                style={{ background: m.avatar_color ?? '#623CEA' }}
                              >
                                {m.avatar_emoji ?? m.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-brand-dark">{m.name}</div>
                                <div className="text-[10px] text-muted-foreground">{m.email}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(group.id, m.id)}
                              className="text-[10px] font-bold text-red-500 px-2 py-1 rounded hover:bg-red-500/5"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add member */}
                    {addingToGroup === group.id ? (
                      <div className="flex gap-2">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-border text-xs bg-white focus:outline-none focus:border-brand-purple"
                        >
                          <option value="">Select participant…</option>
                          {available.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddMember(group.id)}
                          disabled={!selectedUserId}
                          className="px-3 py-2 rounded-lg bg-brand-dark text-white text-xs font-bold hover:bg-brand-dark/90 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setAddingToGroup(null)
                            setSelectedUserId('')
                          }}
                          className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:border-brand-dark"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : available.length > 0 ? (
                      <button
                        onClick={() => setAddingToGroup(group.id)}
                        className="w-full text-xs font-bold text-brand-purple py-2 rounded-lg hover:bg-brand-purple/5 border border-dashed border-brand-purple/30"
                      >
                        + Add participant
                      </button>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-2">
                        All participants are already in this group
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateOpen || editGroup) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsCreateOpen(false)
              setEditGroup(null)
              setError(null)
            }}
          />
          <div className="relative bg-brand-dark rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
            <h2 className="text-lg font-black text-white mb-1">
              {editGroup ? 'Edit Group' : 'Create Group'}
            </h2>
            <p className="text-xs text-white/50 mb-6">
              {editGroup ? 'Update group details' : 'Create a new group for your organization'}
            </p>

            <form onSubmit={editGroup ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Engineering Team"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description…"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-yellow resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false)
                    setEditGroup(null)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-brand-yellow text-brand-dark text-sm font-black rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
