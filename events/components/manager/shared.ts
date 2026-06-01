import type React from 'react'
import type { EventType, Organization } from '../../types'

// ── Palette ───────────────────────────────────────────────────────────────────
export const C = {
  bg: '#f5f4f0', surface: '#ffffff', border: '#e8e6e0', border2: '#f0ede8',
  text: '#1a1a1a', muted: '#888', faint: '#bbb',
  brand: '#DC2626', brandBg: '#fef2f2',
  green: '#16a34a', greenBg: '#f0fdf4',
  yellow: '#d97706', yellowBg: '#fffbeb',
  blue: '#2563EB', blueBg: '#eff6ff',
}

export interface ExistingEvent {
  id: string; title: string; start_at: string; end_at: string
  status: string; organization: string | null; domain: string | null
  publish_at: string | null; description: string | null
}

export interface StagedEvent {
  _key: string
  title: string
  event_type: EventType
  organization: Organization | null
  domain: string | null
  location: string | null
  start_at: string
  end_at: string
  description: string | null
  team_members: string[] | null
  participants_url: string | null
  dupStatus: 'clean' | 'possible' | 'exact'
  dupTitle?: string
  selected: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function toISO(date: string, time = '10:00') {
  return `${date}T${time}:00Z`
}

export function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name: string) {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

export const AVATAR_COLORS = [
  { bg: '#fef2f2', color: '#DC2626' },
  { bg: '#eff6ff', color: '#2563EB' },
  { bg: '#f0fdf4', color: '#16a34a' },
  { bg: '#fefce8', color: '#ca8a04' },
  { bg: '#f5f3ff', color: '#7C3AED' },
  { bg: '#ecfeff', color: '#0891b2' },
  { bg: '#fdf2f8', color: '#be185d' },
  { bg: '#fff7ed', color: '#ea580c' },
]

export function avatarColor(name: string) {
  const hash = name.split('').reduce((h, c) => h + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function similarTitle(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^а-яa-z0-9]/gi, '')
  const na = norm(a), nb = norm(b)
  if (na === nb) return 'exact'
  if (na.includes(nb) || nb.includes(na)) return 'possible'
  const words = na.split(' ').filter(w => w.length > 3)
  const matches = words.filter(w => nb.includes(w))
  if (matches.length >= 2) return 'possible'
  return 'clean'
}

export function detectDuplicates(staged: Omit<StagedEvent, 'dupStatus'|'dupTitle'|'selected'>[], existing: ExistingEvent[]): StagedEvent[] {
  return staged.map(ev => {
    let dupStatus: StagedEvent['dupStatus'] = 'clean'
    let dupTitle: string | undefined
    for (const ex of existing) {
      const sim = similarTitle(ev.title, ex.title)
      if (sim !== 'clean') {
        dupStatus = sim
        dupTitle  = ex.title
        if (sim === 'exact') break
      }
    }
    return { ...ev, dupStatus, dupTitle, selected: dupStatus === 'clean' }
  })
}

export function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { width: '100%', padding: '8px 11px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', boxSizing: 'border-box', ...extra }
}

export function parseCSV(text: string): StagedEvent[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const idx = (name: string) => headers.indexOf(name)

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const get  = (name: string) => cols[idx(name)] ?? ''

    const startDate = get('start_date') || isoDate(new Date())
    const endDate   = get('end_date') || startDate

    return {
      _key: `csv-${i}-${Date.now()}`,
      title:            get('title') || `Event ${i + 1}`,
      event_type:       (get('event_type') || 'event') as EventType,
      organization:     (get('organization') || null) as Organization | null,
      domain:           get('domain') || null,
      location:         get('location') || null,
      start_at:         toISO(startDate),
      end_at:           toISO(endDate, '18:00'),
      description:      get('description') || null,
      participants_url: get('participants_url') || null,
      team_members:     get('team_members') ? get('team_members').split('|').map(s => s.trim()) : null,
      dupStatus: 'clean' as const,
      selected: true,
    }
  }).filter(e => e.title)
}
