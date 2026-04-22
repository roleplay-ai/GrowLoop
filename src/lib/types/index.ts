// ── Re-export generated database types ─────────────────────────────────────
export type { Database, Tables, InsertTables, UpdateTables, Enums, Json } from './database'

// ── Enums (alias for convenience) ──────────────────────────────────────────
export type UserRole    = 'super_admin' | 'hr' | 'participant'
export type UserStatus  = 'active' | 'inactive' | 'invited' | 'suspended'
export type PlanTier    = 'starter' | 'growth' | 'enterprise'
export type SkillSource = 'platform' | 'org_custom'
export type ActionStatus = 'pending' | 'done' | 'skipped'
export type InviteStatus = 'pending' | 'submitted' | 'expired'
export type Phase       = 'pre' | 'training' | 'post'
export type EmailEvent  = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

// ── Core entities ─────────────────────────────────────────────────────────
export interface Organization {
  id:               string
  name:             string
  slug:             string
  logo_url?:        string
  primary_contact?: string
  region:           string
  plan:             PlanTier
  seat_limit:       number
  status:           UserStatus
  created_by?:      string
  created_at:       string
  updated_at:       string
}

export interface User {
  id:               string
  org_id?:          string
  role:             UserRole
  email:            string
  name:             string
  plain_password?:  string   // stored per requirement; never sent to browser
  must_change_pw:   boolean
  func?:            string
  level?:           string
  title?:           string
  avatar_emoji?:    string
  avatar_color?:    string
  status:           UserStatus
  joined_at:        string
  last_active_at?:  string
  created_at:       string
  updated_at:       string
}

export interface Group {
  id:             string
  org_id:         string
  name:           string
  description?:   string
  default_skills: string[]
  created_at:     string
}

export interface Skill {
  id:           string
  org_id?:      string
  source:       SkillSource
  name:         string
  icon?:        string
  description?: string
  dimensions?:  SkillDimension[]
  is_archived:  boolean
  created_by?:  string
  created_at:   string
  updated_at:   string
}

export interface SkillDimension {
  id:          string
  name:        string
  description: string
  rubric?:     Record<string, string>   // { "1": "...", "2": "...", ... }
}

export interface UserSkill {
  id:             string
  user_id:        string
  skill_id:       string
  org_id:         string
  is_active:      boolean
  is_locked:      boolean
  baseline_peer?: number
  current_peer?:  number
  peer_growth?:   number
  self_avg?:      number
  surveys_sent:   number
  surveys_filled: number
  rc_round:       number
  phase:          Phase
  assigned_at:    string
  skill?:         Skill  // joined
}

export interface RealityCheckRound {
  id:              string
  user_skill_id:   string
  round_number:    number
  self_ratings?:   Record<string, number>
  self_comments?:  string
  peer_aggregate?: Record<string, { avg: number; count: number }>
  peer_themes?:    Array<{ theme: string; count: number }>
  started_at:      string
  closed_at?:      string
}

export interface PeerInvite {
  id:               string
  reality_check_id: string
  peer_email:       string
  peer_relation?:   'manager' | 'peer' | 'report' | 'cross_fn'
  token:            string
  status:           InviteStatus
  sent_at:          string
  submitted_at?:    string
  reminder_count:   number
}

export interface Action {
  id:             string
  user_skill_id:  string
  title:          string
  what?:          string
  why?:           string
  how?:           string
  difficulty?:    number
  effort_days?:   number
  status:         ActionStatus
  due_date?:      string
  done_at?:       string
  notes?:         string
  position:       number
  created_at:     string
  updated_at:     string
}

export interface Conversation {
  id:          string
  user_id:     string
  user_skill_id?: string
  phase:       Phase
  created_at:  string
  updated_at:  string
}

export interface Message {
  id:              string
  conversation_id: string
  role:            'user' | 'assistant'
  content:         string
  tokens_used?:    number
  created_at:      string
}

export interface AgentIntel {
  id:            string
  user_id:       string
  skill_id:      string
  org_id:        string
  current_level?: string
  context?:       string
  motivations?:   string[]
  blockers?:      string[]
  raw_summary?:   string
  updated_at:     string
}

export interface SkillInsight {
  id:              string
  org_id:          string
  skill_id:        string
  avg_peer_score?: number
  top_scorers?:    string[]
  top_growers?:    string[]
  volume:          number
  unique_askers:   number
  unique_convos:   number
  summary?:        string
  top_themes?:     Array<{ name: string; volume: number; sampleQs: string[] }>
  sample_qs?:      string[]
  recommended_hr_action?: string
  generated_at:    string
}

// ── UI helpers ──────────────────────────────────────────────────────────────
export type NavItem = {
  label:   string
  href:    string
  icon:    string
  badge?:  string | number
  badgeVariant?: 'red' | 'green'
}

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface PageMeta {
  title:       string
  description?: string
}
