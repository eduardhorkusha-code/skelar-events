export type EventType    = string  // DB constraint dropped — managed via event_config

export interface IntensiveMilestone {
  label: 'Start' | 'Short list' | 'Final'
  date: string  // ISO datetime string
}

export interface EventTypeConfig {
  key:   string
  label: string
  color: string
  bg:    string
}

export interface TeamConfig {
  name:  string
  color: string
  bg:    string
}

export interface EventConfig {
  domains:       string[]
  locations:     string[]
  event_types:   EventTypeConfig[]
  teams?:        TeamConfig[]
  contact_email?: string   // platform contact shown to all users; set by manager
  notion_url?:     string
  sub_date_slots?: [string, string, string]
  internal_tags?:  string[]
}

/** Parse "Name::Team" or plain "Name" from the team_members array */
export function parseTeamMember(s: string): { name: string; team: string | null } {
  const sep = s.indexOf('::')
  if (sep === -1) return { name: s.trim(), team: null }
  return { name: s.slice(0, sep).trim(), team: s.slice(sep + 2).trim() || null }
}
// ── Recurrence ───────────────────────────────────────────────────────────────
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'
export type RecurrenceEndType   = 'count' | 'date' | 'never'
export type RecurrenceDayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
export type RecurrenceEditMode  = 'this' | 'this_and_following' | 'all'

export interface RecurrenceRule {
  frequency:     RecurrenceFrequency
  days_of_week?: RecurrenceDayOfWeek[]  // for weekly / biweekly
  end_type:      RecurrenceEndType
  count?:        number                 // for end_type = 'count'
  until?:        string                 // for end_type = 'date', YYYY-MM-DD
}
// ─────────────────────────────────────────────────────────────────────────────

export type Organization = 'genesis' | 'skelar'
export type EventStatus  = 'draft' | 'published' | 'cancelled' | 'deleted'
export type RsvpStatus   = 'going' | 'interested' | 'not_going'

export interface CorporateEvent {
  id:               string
  title:            string
  description:      string | null
  start_at:         string
  end_at:           string
  location:         string | null
  location_url:     string | null
  event_type:       EventType
  organization:     Organization | null
  domain:           string | null
  participants_url:  string | null
  registration_url?:      string | null
  landing_url?:           string | null
  shortlist_date?:        string | null  // DATE — ISO YYYY-MM-DD
  registration_deadline?: string | null  // DATE — ISO YYYY-MM-DD
  team_members:     string[] | null
  capacity:         number | null
  cover_emoji:      string | null
  cover_color:      string | null
  status:           EventStatus
  external_id?:     string | null   // opaque key from source API (e.g. Genesis event id)
  external_source?: string | null   // 'genesis' | 'ashby' | …
  created_by:       string | null
  created_at:       string
  updated_at:       string
  going_count:      number
  interested_count: number
  my_rsvp:          RsvpStatus | null
  // Recurrence fields (present when the event is recurring)
  recurrence_rule?:  RecurrenceRule | null
  recurrence_id?:    string | null
  recurrence_index?: number | null
  // Intensive milestone dates (only for event_type = 'intensive')
  intensive_milestones?: IntensiveMilestone[] | null
  // v2 fields
  owner?:          string | null
  tags?:           string[]
  ashby_url?:      string | null
  long_list_url?:  string | null
  sub_dates?:      string[]
  show_time?:      boolean
}

export const EVENT_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  course:    { label: 'Course',     color: '#d97706', bg: '#fffbeb' },
  event:     { label: 'Event',      color: '#DC2626', bg: '#fef2f2' },
  intensive: { label: 'Intensive',  color: '#d97706', bg: '#fff7ed' },
  lecture:   { label: 'Lecture',    color: '#7C3AED', bg: '#f5f3ff' },
  other:     { label: 'Other',      color: '#6b7280', bg: '#f9fafb' },
}

const DEFAULT_TYPE = { label: 'Event', color: '#6b7280', bg: '#f9fafb' }

export function resolveTypeMeta(
  key: string,
  customTypes?: EventTypeConfig[]
): { label: string; color: string; bg: string } {
  if (customTypes) {
    const found = customTypes.find(t => t.key === key)
    if (found) return found
  }
  return EVENT_TYPE_META[key] ?? DEFAULT_TYPE
}

export const ORG_META: Record<Organization, { label: string; color: string; bg: string }> = {
  genesis: { label: 'GENESIS', color: '#d97706', bg: '#fffbeb' },
  skelar:  { label: 'SKELAR',  color: '#DC2626', bg: '#fef2f2' },
}

export const DOMAINS = [
  'academy', 'analytics', 'education', 'finance', 'product',
  'recruiting', 'tech', 'universities', 'warsaw', 'ai', 'other',
] as const

export const LOCATIONS = ['Online', 'Kyiv', 'Lviv', 'Warsaw', 'UA', 'UA & PL'] as const

export const DEFAULT_SUB_DATE_SLOTS: [string, string, string] = [
  'Ярмарок вакансій',
  'Short list',
  '',
]

export const DEFAULT_INTERNAL_TAGS = ['Offline', 'Validation', 'Invite/long list']
