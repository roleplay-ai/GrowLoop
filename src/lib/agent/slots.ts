// src/lib/agent/slots.ts
//
// Single source of truth for the structured "Agent Intel" slots.
// Used by:
//   - the chat slot-filling state machine (asks the next missing slot)
//   - the side-panel rendering (cards + edit UI)
//   - /api/intel/answer (whitelists which slots can be written)
//
// Every slot maps to a key inside agent_intel.profile (jsonb).

export type SlotKey =
  | 'role'
  | 'fn'
  | 'level'
  | 'goal'
  | 'blocker'
  | 'frequency'

export interface SlotChip {
  /** What's stored if this chip is picked. */
  value: string
  /** What's shown on the chip button (defaults to value). */
  label?: string
  /** If true, picking this chip switches the input to a free-text textarea. */
  free?: boolean
}

export interface SlotDef {
  key: SlotKey
  /** Section header this slot belongs under. */
  section: 'role' | 'goal'
  /** Big emoji label (e.g. 💼). */
  icon: string
  /** Human-readable label. */
  label: string
  /** Hint shown in the side panel when the slot is empty. */
  hint: string
  /** The question the coach asks in chat. Supports `{skill}` placeholder. */
  question: string
  /** Quick-reply chips. If undefined, the input is free-text only. */
  chips?: SlotChip[]
  /** If false, the only way to answer is via chips (no textarea fallback). */
  allowFreeText?: boolean
}

export const SECTIONS = [
  { key: 'role' as const, color: '#3696FC', icon: '👤', label: 'Your Role' },
  { key: 'goal' as const, color: '#F68A29', icon: '🎯', label: 'Skill & Goal' },
]

export const SLOTS: SlotDef[] = [
  {
    key: 'role',
    section: 'role',
    icon: '💼',
    label: 'Job Title / Role',
    hint: 'Your current role or job title',
    question: "Quick context so I can truly personalize — what's your <strong>role / job title</strong>?",
    allowFreeText: true,
  },
  {
    key: 'fn',
    section: 'role',
    icon: '🧭',
    label: 'Function',
    hint: 'Sales, Eng, Product, HR, etc',
    question: 'Got it 🙌 Which <strong>function</strong> are you in?',
    chips: [
      { value: '💼 Sales' },
      { value: '⚙️ Engineering' },
      { value: '🧭 Product' },
      { value: '🎨 Design' },
      { value: '📈 Marketing' },
      { value: '🧑‍💼 HR / People' },
      { value: '💰 Finance' },
      { value: '🏭 Ops' },
      { value: '✏️ Something else', free: true },
    ],
    allowFreeText: true,
  },
  {
    key: 'level',
    section: 'role',
    icon: '📈',
    label: 'Level',
    hint: 'IC, Manager, Sr Mgr, Director+',
    question: 'And your <strong>level</strong>?',
    chips: [
      { value: '👤 IC (Individual Contributor)' },
      { value: '🧑‍💼 Manager' },
      { value: '🧑‍🏫 Sr. Manager' },
      { value: '🧑‍🚀 Director+' },
      { value: '✏️ Something else', free: true },
    ],
    allowFreeText: true,
  },
  {
    key: 'goal',
    section: 'goal',
    icon: '🌟',
    label: 'Why This Skill Matters',
    hint: 'What mastering this unlocks for you',
    question: 'Why does building <strong>{skill}</strong> matter to you right now?',
    chips: [
      { value: '📈 Next promotion' },
      { value: '💼 Better at my current job' },
      { value: '🎯 Specific upcoming challenge' },
      { value: '🚀 General growth' },
      { value: '✏️ My own reason', free: true },
    ],
    allowFreeText: true,
  },
  {
    key: 'blocker',
    section: 'goal',
    icon: '🚧',
    label: "What's Holding You Back",
    hint: 'e.g. "No time", "Feels awkward", "No feedback"',
    question: "What's been <strong>holding you back</strong> on this skill so far?",
    chips: [
      { value: '⏰ No time' },
      { value: '😬 Feels awkward' },
      { value: "🤷 Don't know how" },
      { value: '🪞 No honest mirror' },
      { value: '✏️ Something else', free: true },
    ],
    allowFreeText: true,
  },
  {
    key: 'frequency',
    section: 'goal',
    icon: '📊',
    label: 'Current Practice Level',
    hint: 'How often you practise this skill today',
    question: 'How confident at <strong>{skill}</strong> right now?',
    chips: [
      { value: '🔥 Pretty solid (often)' },
      { value: '🙂 Getting there (sometimes)' },
      { value: '😬 Shaky (rarely)' },
      { value: '🆕 Beginner (never)' },
    ],
    allowFreeText: false,
  },
]

export const SLOT_KEYS: SlotKey[] = SLOTS.map((s) => s.key)
export const SLOTS_BY_KEY: Record<SlotKey, SlotDef> = Object.fromEntries(
  SLOTS.map((s) => [s.key, s]),
) as Record<SlotKey, SlotDef>

export type IntelProfile = Partial<Record<SlotKey, string>>

/** First slot that hasn't been filled yet, or null if everything is captured. */
export function nextMissingSlot(profile: IntelProfile | null | undefined): SlotDef | null {
  if (!profile) return SLOTS[0]
  for (const s of SLOTS) {
    const v = profile[s.key]
    if (!v || !v.trim()) return s
  }
  return null
}

/** Number of slots filled, plus the hard-coded "active skill" slot. */
export function countCaptured(profile: IntelProfile | null | undefined): {
  captured: number
  total: number
  pct: number
} {
  const total = SLOTS.length + 1 // + active skill
  let captured = 1 // active skill is always known
  if (profile) {
    for (const s of SLOTS) if (profile[s.key]?.trim()) captured++
  }
  return { captured, total, pct: Math.round((captured / total) * 100) }
}

/** % readiness, mirroring the HTML reference's "Journey Progress" formula. */
export function journeyProgress(profile: IntelProfile | null | undefined): number {
  if (!profile) return 0
  let r = 0
  if (profile.frequency) r += 20
  if (profile.blocker) r += 10
  if (profile.goal) r += 10
  if (profile.role && profile.fn && profile.level) r += 30
  // (RC + actions add another 30 each, wired in later phases)
  return Math.min(r, 100)
}
