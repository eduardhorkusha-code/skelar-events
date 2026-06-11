'use client'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { CorporateEvent, EventType, Organization, RsvpStatus, EventConfig, EventTypeConfig, TeamConfig, IntensiveMilestone } from '../types'
import { EVENT_TYPE_META, ORG_META, DOMAINS, LOCATIONS, resolveTypeMeta, parseTeamMember } from '../types'
import {
  getCalendarDays, isoDate, isoDateUTC, eventsByDay, formatTime, formatDate, formatDateShort,
  googleCalendarUrl, outlookCalendarUrl, MONTHS_UK, DAYS_UK, MONTHS_EN, DAYS_EN,
  type CalendarEntry,
} from '../lib/calendar-utils'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#f5f4f0',
  surface:   '#ffffff',
  border:    '#e8e6e0',
  border2:   '#f0ede8',
  text:      '#1a1a1a',
  muted:     '#888',
  faint:     '#bbb',
  brand:     '#DC2626',
  brandBg:   '#fef2f2',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Badges ────────────────────────────────────────────────────────────────────
function OrgTypeBadge({ event, small, customTypes }: { event: CorporateEvent; small?: boolean; customTypes?: EventTypeConfig[] }) {
  const tm = resolveTypeMeta(event.event_type, customTypes)
  const org = event.organization ? ORG_META[event.organization] : null
  const pad = small ? '2px 7px' : '3px 9px'
  const fs  = small ? 10 : 11
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: pad, borderRadius: 4, fontSize: fs, fontWeight: 700,
      background: tm.bg, color: tm.color, letterSpacing: '0.03em',
      whiteSpace: 'nowrap' as const,
    }}>
      {tm.label.toUpperCase()}
      {org && (
        <span style={{
          marginLeft: 2, padding: '0 4px',
          background: org.bg, color: org.color, borderRadius: 3,
          fontSize: fs - 1,
        }}>
          {org.label}
        </span>
      )}
    </span>
  )
}

function DomainChip({ domain }: { domain: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: '#f0ede8', color: C.muted, letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    }}>
      {domain}
    </span>
  )
}

// ── Add-to-Calendar dropdown ──────────────────────────────────────────────────
function AddToCalendar({ event }: { event: CorporateEvent }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])
  const items = [
    { label: 'Google Calendar',   href: googleCalendarUrl(event),            target: '_blank' },
    { label: 'Outlook',           href: outlookCalendarUrl(event),           target: '_blank' },
    { label: 'Apple / .ics file', href: `/api/events/${event.id}/ics`,       target: '_self'  },
  ]
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={btnStyle(C.border, C.surface, C.text)}>
        📅 Add to calendar ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 200, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', padding: 6, minWidth: 180 }}>
          {items.map(it => (
            <a key={it.label} href={it.href} target={it.target} rel={it.target === '_blank' ? 'noopener noreferrer' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 7, fontSize: 13, fontWeight: 500, color: C.text, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => setOpen(false)}
            >
              {it.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function btnStyle(border: string, bg: string, color: string, bold = false): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: bold ? 700 : 600, border: `1px solid ${border}`, background: bg, color, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }
}

// ── Event Detail Modal ────────────────────────────────────────────────────────
/** Group "Name::Team" entries by team, return ordered list of {team, names[]} */
function groupByTeam(members: string[]): { team: string | null; names: string[] }[] {
  const order: (string | null)[] = []
  const map = new Map<string | null, string[]>()
  members.forEach(m => {
    const { name, team } = parseTeamMember(m)
    if (!map.has(team)) { map.set(team, []); order.push(team) }
    map.get(team)!.push(name)
  })
  return order.map(t => ({ team: t, names: map.get(t)! }))
}

function EventDetailModal({ event, onClose, onRsvp, rsvpLoading, canEdit, onEdit, teams, customTypes }: {
  event: CorporateEvent; onClose: () => void
  onRsvp: (status: RsvpStatus | null) => void; rsvpLoading: boolean
  canEdit: boolean; onEdit: () => void
  teams: TeamConfig[]
  customTypes?: EventTypeConfig[]
}) {
  const tm = resolveTypeMeta(event.event_type, customTypes)
  const start = new Date(event.start_at), end = new Date(event.end_at)
  const sameDay = isoDate(start) === isoDate(end)
  // Strip prefixes added by external imports (Genesis) that are visual noise in the modal
  const displayTitle = event.title.replace(/^(START|END|FINISH)\s+/i, '').trim()
  const dateStr = sameDay
    ? `${formatDate(event.start_at)}, ${formatTime(event.start_at)} – ${formatTime(event.end_at)}`
    : `${formatDate(event.start_at)} → ${formatDate(event.end_at)}`

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: '60px 16px 16px' }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ background: `linear-gradient(135deg, ${tm.bg} 0%, ${C.surface} 100%)`, borderBottom: `1px solid ${C.border2}`, padding: '28px 28px 20px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: C.muted }}>✕</button>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
            <OrgTypeBadge event={event} customTypes={customTypes} />
            {event.domain && <DomainChip domain={event.domain} />}
            {event.status === 'draft' && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: '#fefce8', color: '#ca8a04' }}>DRAFT</span>}
            {event.status === 'cancelled' && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: C.brandBg, color: C.brand }}>CANCELLED</span>}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3 }}>{displayTitle}</h2>
        </div>

        <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 18 }}>🗓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{dateStr}</div>
              {!sameDay && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Multi-day event</div>}
            </div>
          </div>

          {event.location && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {event.location.split(',').map(s => s.trim()).filter(Boolean).map((loc, i) => (
                  event.location_url
                    ? <a key={i} href={event.location_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 12, background: '#f0f0f0', fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>{loc} ↗</a>
                    : <span key={i} style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 12, background: '#f0f0f0', fontSize: 13, fontWeight: 600, color: C.text }}>{loc}</span>
                ))}
              </div>
            </div>
          )}

          {event.team_members && event.team_members.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Responsible persons</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {groupByTeam(event.team_members).map(({ team, names }) => {
                  const tm = teams.find(t => t.name === team)
                  return (
                    <div key={team ?? '__none__'} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {team && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: tm?.color ?? C.muted, minWidth: 80, paddingTop: 5, flexShrink: 0 }}>
                          {team}:
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                        {names.map(name => (
                          <span key={name} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: tm?.bg ?? C.bg, border: `1px solid ${tm?.color ?? C.border}`, color: tm?.color ?? C.text, fontWeight: 500 }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>👥</span>
            <span style={{ fontSize: 13, color: C.text }}>
              <strong style={{ color: '#16a34a' }}>{event.going_count}</strong> going ·{' '}
              <strong style={{ color: '#d97706' }}>{event.interested_count}</strong> interested
              {event.capacity && <span style={{ color: C.muted }}> · {event.capacity} spots</span>}
            </span>
          </div>

          {event.description && (
            <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 14 }}>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' as const }}>{event.description}</p>
            </div>
          )}

          {(event.participants_url || event.registration_url || event.landing_url) && (
            <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 14, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {event.registration_url && (
                <a href={event.registration_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                  📝 Registration Form for Business ↗
                </a>
              )}
              {event.participants_url && (
                <a href={event.participants_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                  📋 Participant Links ↗
                </a>
              )}
              {event.landing_url && (
                <a href={event.landing_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                  🌐 Project Landing Page ↗
                </a>
              )}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Your response</div>
            <RsvpButtons event={event} onRsvp={onRsvp} loading={rsvpLoading} customTypes={customTypes} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10, borderTop: `1px solid ${C.border2}`, paddingTop: 14 }}>
            <AddToCalendar event={event} />
            {canEdit && (
              <button onClick={onEdit} style={btnStyle(C.border, C.surface, C.muted)}>
                ✏️ Edit event
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RSVP Buttons ──────────────────────────────────────────────────────────────
function RsvpButtons({ event, onRsvp, loading, customTypes }: { event: CorporateEvent; onRsvp: (s: RsvpStatus | null) => void; loading: boolean; customTypes?: EventTypeConfig[] }) {
  const isFull    = event.capacity !== null && event.going_count >= event.capacity
  const cancelled = event.status === 'cancelled'
  if (cancelled) return <span style={{ fontSize: 13, color: C.brand, fontWeight: 600 }}>This event has been cancelled</span>
  const btn = (status: RsvpStatus, label: string) => {
    const active   = event.my_rsvp === status
    const disabled = loading || (status === 'going' && isFull && !active)
    const tm = resolveTypeMeta(event.event_type, customTypes)
    return (
      <button onClick={() => onRsvp(active ? null : status)} disabled={disabled} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: `1.5px solid ${active ? tm.color : C.border}`, background: active ? tm.bg : C.surface, color: active ? tm.color : C.text,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !active ? 0.45 : 1, fontFamily: 'inherit', transition: 'all 0.15s',
      }}>
        {label}{active && ' ✓'}
      </button>
    )
  }
  const hasRsvp = event.my_rsvp === 'going' || event.my_rsvp === 'interested'
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
      {btn('going',      isFull ? 'Full' : '✅ Going')}
      {btn('interested', '⭐ Interested')}
      {hasRsvp && btn('not_going', "❌ Can't make it")}
    </div>
  )
}

// ── Team Member Picker ────────────────────────────────────────────────────────
function TeamMemberPicker({ value, onChange, teams }: {
  value:    string[]
  onChange: (v: string[]) => void
  teams:    TeamConfig[]
}) {
  const [name, setName] = useState('')
  const [team, setTeam] = useState(teams[0]?.name ?? '')

  function add() {
    const n = name.trim()
    if (!n) return
    const encoded = team ? `${n}::${team}` : n
    onChange([...value, encoded])
    setName('')
    setTeam(teams[0]?.name ?? '')
  }

  return (
    <div>
      {/* Chips */}
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
          {value.map((m, i) => {
            const p  = parseTeamMember(m)
            const tm = teams.find(t => t.name === p.team)
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: tm?.bg ?? C.bg, border: `1px solid ${tm?.color ?? C.border}`, fontSize: 12, color: C.text }}>
                {p.name}
                {p.team && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: tm?.color ?? C.muted, color: '#fff' }}>{p.team}</span>}
                <button onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 15, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
              </span>
            )
          })}
        </div>
      )}
      {/* Add row */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Full name…"
          style={{ flex: 1, padding: '8px 11px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none' }}
        />
        {teams.length > 0 && (
          <select
            value={team}
            onChange={e => setTeam(e.target.value)}
            style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">No team</option>
            {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        )}
        <button onClick={add} disabled={!name.trim()} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', background: name.trim() ? C.text : C.faint, color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Admin Event Form ──────────────────────────────────────────────────────────
function AdminEventForm({ initial, onSave, onDelete, onClose, saving, saveError, domains, locations, eventTypes, teams }: {
  initial: Partial<CorporateEvent>; onSave: (d: Partial<CorporateEvent>) => void
  onDelete?: () => void; onClose: () => void; saving: boolean; saveError?: string | null
  domains: string[]; locations: string[]; eventTypes: EventTypeConfig[]; teams: TeamConfig[]
}) {
  const isEdit = !!initial.id
  const [title,          setTitle]          = useState(initial.title ?? '')
  const [description,    setDescription]    = useState(initial.description ?? '')
  const [eventType,      setEventType]      = useState<EventType>(initial.event_type ?? 'event')
  const [organization,   setOrganization]   = useState<Organization | ''>(initial.organization ?? '')
  const [domain,         setDomain]         = useState(initial.domain ?? '')
  const [location,       setLocation]       = useState<string[]>(
    initial.location ? initial.location.split(',').map(s => s.trim()).filter(Boolean) : []
  )
  const [locationUrl,    setLocationUrl]    = useState(initial.location_url ?? '')
  const [participantsUrl,setParticipantsUrl]= useState(initial.participants_url ?? '')
  const [registrationUrl,    setRegistrationUrl]    = useState(initial.registration_url ?? '')
  const [landingUrl,         setLandingUrl]         = useState(initial.landing_url ?? '')
  const [shortlistDate,      setShortlistDate]      = useState(initial.shortlist_date ?? '')
  const [registrationDeadline,setRegistrationDeadline]= useState(initial.registration_deadline ?? '')
  const [teamMembers,    setTeamMembers]    = useState<string[]>(initial.team_members ?? [])
  const [startDate,      setStartDate]      = useState(initial.start_at ? initial.start_at.slice(0, 10) : '')
  const [startTime,      setStartTime]      = useState(initial.start_at ? initial.start_at.slice(11, 16) : '10:00')
  const [endDate,        setEndDate]        = useState(initial.end_at   ? initial.end_at.slice(0, 10)   : '')
  const [endTime,        setEndTime]        = useState(initial.end_at   ? initial.end_at.slice(11, 16)  : '12:00')
  const [capacity,       setCapacity]       = useState(initial.capacity ? String(initial.capacity) : '')
  const [status,         setStatus]         = useState<'draft'|'published'>(initial.status === 'published' ? 'published' : 'draft')
  const [confirmDel,     setConfirmDel]     = useState(false)

  function handleSave(publish: boolean) {
    onSave({
      title, description: description || null,
      event_type: eventType,
      organization: organization || null,
      domain: domain || null,
      location: location.length > 0 ? location.join(', ') : null, location_url: locationUrl || null,
      participants_url: participantsUrl || null,
      registration_url: registrationUrl || null,
      landing_url: landingUrl || null,
      shortlist_date: shortlistDate || null,
      registration_deadline: registrationDeadline || null,
      team_members: teamMembers.length > 0 ? teamMembers : null,
      start_at: `${startDate}T${startTime}:00Z`,
      end_at:   `${endDate || startDate}T${endTime}:00Z`,
      capacity: capacity ? parseInt(capacity) : null,
      status: publish ? 'published' : 'draft',
    })
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', boxSizing: 'border-box' as const }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: C.surface, display: 'flex', flexDirection: 'column' as const, overflow: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{isEdit ? 'Edit event' : 'New event'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '20px 24px', display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
          <div>
            <span style={lbl}>Title *</span>
            <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="IT School XVI…" />
          </div>

          <div>
            <span style={lbl}>Type</span>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {eventTypes.map(t => (
                <button key={t.key} onClick={() => setEventType(t.key)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${eventType === t.key ? t.color : C.border}`, background: eventType === t.key ? t.bg : C.surface, color: eventType === t.key ? t.color : C.text, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={lbl}>Organization</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['', 'genesis', 'skelar'] as const).map(o => {
                const active = organization === o
                const meta   = o ? ORG_META[o] : null
                return (
                  <button key={o || 'none'} onClick={() => setOrganization(o)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${active ? (meta?.color ?? C.brand) : C.border}`, background: active ? (meta?.bg ?? C.brandBg) : C.surface, color: active ? (meta?.color ?? C.brand) : C.text, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {o ? o.toUpperCase() : 'None'}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span style={lbl}>Domain</span>
            <select style={{ ...inp }} value={domain} onChange={e => setDomain(e.target.value)}>
              <option value="">— Not set —</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <span style={lbl}>Start</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" style={{ ...inp, flex: 2 }} value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} />
              <input type="time" style={{ ...inp, flex: 1 }} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
          </div>
          <div>
            <span style={lbl}>End</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" style={{ ...inp, flex: 2 }} value={endDate || startDate} onChange={e => setEndDate(e.target.value)} />
              <input type="time" style={{ ...inp, flex: 1 }} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <span style={lbl}>Location</span>
            <MultiSelectDropdown
              label="Location"
              options={locations.map(l => ({ value: l, label: l }))}
              selected={location}
              onChange={setLocation}
            />
          </div>
          <div>
            <span style={lbl}>Location URL (optional)</span>
            <input style={inp} value={locationUrl} onChange={e => setLocationUrl(e.target.value)} placeholder="https://meet.google.com/…" />
          </div>

          <div>
            <span style={lbl}>Responsible persons</span>
            <TeamMemberPicker value={teamMembers} onChange={setTeamMembers} teams={teams} />
          </div>

          <div>
            <span style={lbl}>Participants table URL</span>
            <input style={inp} value={participantsUrl} onChange={e => setParticipantsUrl(e.target.value)} placeholder="https://docs.google.com/…" />
          </div>

          <div>
            <span style={lbl}>Registration URL <span style={{ fontWeight: 400, color: C.muted }}>(for businesses)</span></span>
            <input style={inp} value={registrationUrl} onChange={e => setRegistrationUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <span style={lbl}>Landing URL</span>
            <input style={inp} value={landingUrl} onChange={e => setLandingUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Shortlist date</span>
              <input type="date" style={inp} value={shortlistDate} onChange={e => setShortlistDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Registration deadline</span>
              <input type="date" style={inp} value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
            </div>
          </div>

          <div>
            <span style={lbl}>Capacity (optional)</span>
            <input type="number" style={{ ...inp, width: 120 }} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="50" min={1} />
          </div>

          <div>
            <span style={lbl}>Description</span>
            <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' as const, lineHeight: 1.6 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What to expect, agenda…" />
          </div>

          {isEdit && onDelete && (
            <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 16 }}>
              {!confirmDel
                ? <button onClick={() => setConfirmDel(true)} style={{ fontSize: 13, color: C.brand, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Delete event…</button>
                : <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: C.brand, fontWeight: 600 }}>Are you sure?</span>
                    <button onClick={onDelete} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: 'none', background: C.brand, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    <button onClick={() => setConfirmDel(false)} style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
              }
            </div>
          )}
        </div>

        {saveError && (
          <div style={{ padding: '10px 24px', background: '#fff0f0', borderTop: `1px solid #fcc`, color: '#c00', fontSize: 12, flexShrink: 0 }}>
            ⚠️ {saveError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={() => handleSave(false)} disabled={saving || !title || !startDate} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
            Save as draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !title || !startDate} style={{ flex: 2, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', background: C.brand, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : status === 'published' ? 'Update & publish' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function MonthCalendar({ events, year, month, onEventClick, cfgTypes }: {
  events: CorporateEvent[]; year: number; month: number; onEventClick: (e: CorporateEvent) => void
  cfgTypes?: EventTypeConfig[]
}) {
  const days          = useMemo(() => getCalendarDays(year, month), [year, month])
  const monthFirstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const byDay         = useMemo(() => eventsByDay(events, monthFirstDay), [events, monthFirstDay])
  const todayStr      = isoDate(new Date())

  const milestonesByDay = useMemo(() => {
    const map = new Map<string, { event: CorporateEvent; milestone: IntensiveMilestone }[]>()
    for (const e of events) {
      if (!e.intensive_milestones) continue
      for (const m of e.intensive_milestones) {
        if (!m.date) continue
        const day = isoDate(new Date(m.date))
        const arr = map.get(day) ?? []
        arr.push({ event: e, milestone: m })
        map.set(day, arr)
      }
    }
    return map
  }, [events])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
        {DAYS_EN.map(d => (
          <div key={d} style={{ textAlign: 'center' as const, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '8px 0', background: C.text }}>
            <span style={{ color: '#fff' }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {days.map((day, i) => {
          const dayStr      = isoDate(day)
          const isToday     = dayStr === todayStr
          const isThisMonth = day.getMonth() === month
          const dayEvents   = byDay.get(dayStr) ?? []
          const shown       = dayEvents.slice(0, 3)
          const extra       = dayEvents.length - shown.length
          return (
            <div key={i} style={{
              minHeight: 120,
              background: isThisMonth ? C.surface : '#fafaf9',
              border: `1px solid ${C.border2}`,
              display: 'flex', flexDirection: 'column' as const,
              overflow: 'hidden',
            }}>
              {/* Day number row — fixed */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 6px 3px', flexShrink: 0, borderBottom: dayEvents.length > 0 ? `1px solid ${C.border2}` : 'none' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: isToday ? 700 : 400,
                  background: isToday ? C.brand : 'transparent',
                  color: isToday ? '#fff' : isThisMonth ? C.text : C.faint,
                }}>
                  {day.getDate()}
                </div>
              </div>
              {/* Events — fill remaining height, overflow hidden */}
              <div style={{ flex: 1, overflow: 'hidden', padding: '3px 4px 2px', display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                {shown.map(({ event: ev, isEnd, isOngoing }: CalendarEntry) => {
                  const org     = ev.organization ? ORG_META[ev.organization] : null
                  const color   = org?.color ?? resolveTypeMeta(ev.event_type, cfgTypes).color

                  // ── ONGOING chip (spans through this month) ───────────────
                  if (isOngoing) {
                    return (
                      <button
                        key={`${ev.id}-ongoing`}
                        onClick={() => onEventClick(ev)}
                        title={ev.title}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 4,
                          width: '100%', padding: '3px 5px', borderRadius: 3,
                          fontSize: 10.5, fontWeight: 500,
                          background: `${color}08`, color: C.muted,
                          border: `1px dotted ${color}40`,
                          cursor: 'pointer', textAlign: 'left' as const,
                          fontFamily: 'inherit', flexShrink: 0,
                        }}
                      >
                        <span style={{ width: 3, minHeight: 10, borderRadius: 2, background: `${color}50`, flexShrink: 0, display: 'block', marginTop: 2 }} />
                        <span style={{ flex: 1, lineHeight: '15px', whiteSpace: 'normal' as const, wordBreak: 'break-word' as const }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color, opacity: 0.6, marginRight: 3 }}>→</span>
                          {ev.title}
                          <span style={{ fontSize: 9, color, fontWeight: 700, marginLeft: 4, opacity: 0.6, whiteSpace: 'nowrap' as const }}>
                            ends {formatDateShort(ev.end_at)}
                          </span>
                        </span>
                      </button>
                    )
                  }

                  // ── END day chip ──────────────────────────────────────────
                  if (isEnd) {
                    return (
                      <button
                        key={`${ev.id}-end`}
                        onClick={() => onEventClick(ev)}
                        title={ev.title}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 4,
                          width: '100%', padding: '3px 5px', borderRadius: 3,
                          fontSize: 10.5, fontWeight: 500,
                          background: `${color}08`, color: C.muted,
                          border: `1px dashed ${color}50`,
                          cursor: 'pointer', textAlign: 'left' as const,
                          fontFamily: 'inherit', flexShrink: 0,
                        }}
                      >
                        <span style={{ width: 3, minHeight: 10, borderRadius: 2, background: `${color}60`, flexShrink: 0, display: 'block', marginTop: 2 }} />
                        <span style={{ flex: 1, lineHeight: '15px', whiteSpace: 'normal' as const, wordBreak: 'break-word' as const }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color, opacity: 0.7, marginRight: 3 }}>END</span>
                          {ev.title}
                        </span>
                      </button>
                    )
                  }

                  // ── START day chip ────────────────────────────────────────
                  const isMulti = isoDateUTC(ev.start_at) !== isoDateUTC(ev.end_at)
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      title={ev.title}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 4,
                        width: '100%', padding: '3px 5px', borderRadius: 3,
                        fontSize: 10.5, fontWeight: 500,
                        background: `${color}12`, color: C.text,
                        border: `1px solid ${color}30`,
                        cursor: 'pointer', textAlign: 'left' as const,
                        fontFamily: 'inherit', flexShrink: 0,
                      }}
                    >
                      <span style={{ width: 3, minHeight: 10, borderRadius: 2, background: color, flexShrink: 0, display: 'block', marginTop: 2 }} />
                      <span style={{ flex: 1, lineHeight: '15px', whiteSpace: 'normal' as const, wordBreak: 'break-word' as const }}>
                        {ev.title}
                        {(ev.recurrence_id != null || ev.recurrence_rule != null) && (
                          <span style={{ marginLeft: 3, fontSize: 9 }} title="Recurring event">&#x1F501;</span>
                        )}
                        {isMulti && (
                          <span style={{ fontSize: 9, color, fontWeight: 700, marginLeft: 4, opacity: 0.8, whiteSpace: 'nowrap' as const }}>
                            →{formatDateShort(ev.end_at)}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
                {extra > 0 && (
                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, paddingLeft: 5, marginTop: 1 }}>+{extra} more</span>
                )}
                {/* Milestone tiles for intensive events */}
                {(milestonesByDay.get(dayStr) ?? []).map(({ event: ev, milestone: m }) => (
                  <button
                    key={`${ev.id}-${m.label}`}
                    onClick={() => onEventClick(ev)}
                    title={`${m.label}: ${ev.title}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '2px 5px', borderRadius: 3,
                      fontSize: 10.5, fontWeight: 500,
                      background: '#fff7ed', color: '#92400e',
                      border: '1px solid #d97706',
                      cursor: 'pointer', textAlign: 'left' as const,
                      fontFamily: 'inherit', overflow: 'hidden', flexShrink: 0,
                    }}
                  >
                    <span style={{ width: 3, height: 10, borderRadius: 2, background: '#d97706', flexShrink: 0, display: 'block' }} />
                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, lineHeight: '14px', whiteSpace: 'normal' as const } as React.CSSProperties}>
                      {m.label}: {ev.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Upcoming Events (next N cards) ────────────────────────────────────────────
function UpcomingView({ events, onEventClick, canEdit, onNewEvent, teams, cfgTypes }: {
  events: CorporateEvent[]; onEventClick: (e: CorporateEvent) => void
  canEdit: boolean; onNewEvent: () => void; teams: TeamConfig[]
  cfgTypes?: EventTypeConfig[]
}) {
  const todayStr = isoDate(new Date())
  const upcoming = useMemo(() =>
    events
      .filter(e => e.status === 'published' && isoDate(new Date(e.end_at)) >= todayStr)
      .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [events, todayStr]
  )

  if (upcoming.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '80px 24px', gap: 12 }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>No upcoming events</div>
        {canEdit && <button onClick={onNewEvent} style={{ ...btnStyle('none', C.brand, '#fff', true), marginTop: 8 }}>+ Add event</button>}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>UPCOMING EVENTS</h2>
        {canEdit && <button onClick={onNewEvent} style={{ ...btnStyle('none', C.brand, '#fff', true) }}>+ New event</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {upcoming.map(ev => {
          const start  = new Date(ev.start_at), end = new Date(ev.end_at)
          const sameDay = isoDate(start) === isoDate(end)
          const dateStr = sameDay
            ? `📅 ${formatDate(ev.start_at)}`
            : `📅 ${formatDate(ev.start_at)} → ${formatDate(ev.end_at)}`
          return (
            <button key={ev.id} onClick={() => onEventClick(ev)} style={{ textAlign: 'left' as const, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' as const, gap: 10, transition: 'box-shadow 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = C.faint }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.35, minHeight: '2.7em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ev.title}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{dateStr}</div>
              {ev.location && <div style={{ fontSize: 12, color: C.muted }}>📍 {ev.location.split(',').map(s => s.trim()).filter(Boolean).join(' · ')}</div>}
              {ev.domain && <DomainChip domain={ev.domain} />}
              <OrgTypeBadge event={ev} small customTypes={cfgTypes} />
              {ev.team_members && ev.team_members.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                  {groupByTeam(ev.team_members).map(({ team, names }) => {
                    const tm = teams.find(t => t.name === team)
                    return (
                      <div key={team ?? '__none__'} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        {team && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: tm?.color ?? C.muted, minWidth: 64, paddingTop: 3, flexShrink: 0 }}>
                            {team}:
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                          {names.map(name => (
                            <span key={name} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: tm?.bg ?? C.bg, border: `1px solid ${tm?.color ?? C.border}`, color: tm?.color ?? C.text, fontWeight: 500 }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Past Events Table ─────────────────────────────────────────────────────────
function AllEventsTable({ events, onEventClick, cfgTypes }: { events: CorporateEvent[]; onEventClick: (e: CorporateEvent) => void; cfgTypes?: EventTypeConfig[] }) {
  const todayStr = isoDate(new Date())
  const sorted = useMemo(() =>
    [...events]
      .filter(e => isoDate(new Date(e.end_at)) < todayStr)
      .sort((a, b) => b.start_at.localeCompare(a.start_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, todayStr]
  )

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' as const, textAlign: 'left' as const, whiteSpace: 'nowrap' as const, borderBottom: `2px solid ${C.border}` }
  const td: React.CSSProperties = { padding: '12px 12px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border2}`, verticalAlign: 'middle' as const }

  return (
    <div style={{ overflowX: 'auto' as const }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' as const, background: C.surface, borderRadius: 12, overflow: 'hidden' }}>
        <thead>
          <tr>
            <th style={th}>Event</th>
            <th style={th}>Type</th>
            <th style={th}>Dates</th>
            <th style={th}>Domain</th>
            <th style={th}>Location</th>
            <th style={th}>Organization</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(ev => {
            const sameDay = isoDate(new Date(ev.start_at)) === isoDate(new Date(ev.end_at))
            const org     = ev.organization ? ORG_META[ev.organization] : null
            const tm      = resolveTypeMeta(ev.event_type, cfgTypes)
            return (
              <tr key={ev.id} onClick={() => onEventClick(ev)} style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...td, fontWeight: 600 }}>{ev.title}</td>
                <td style={td}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: tm.bg, color: tm.color, fontWeight: 600 }}>{tm.label.toLowerCase()}</span>
                </td>
                <td style={td}>
                  <div style={{ fontSize: 12 }}>{formatDate(ev.start_at)}</div>
                  {!sameDay && <div style={{ fontSize: 12, color: C.muted }}>→ {formatDate(ev.end_at)}</div>}
                </td>
                <td style={td}>{ev.domain ? <DomainChip domain={ev.domain} /> : <span style={{ color: C.faint }}>—</span>}</td>
                <td style={{ ...td, color: C.muted }}>{ev.location ?? '—'}</td>
                <td style={td}>
                  {org
                    ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: org.bg, color: org.color, fontWeight: 700 }}>{org.label}</span>
                    : <span style={{ color: C.faint }}>—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '60px 24px', color: C.muted, fontSize: 14 }}>No past events match your filters</div>
      )}
    </div>
  )
}

// ── Filters Bar ───────────────────────────────────────────────────────────────
interface Filters {
  domain:   string[]
  type:     EventType[]
  location: string[]
  org:      'all' | 'skelar' | 'genesis'
}

const CLEAR_FILTERS: Filters = { domain: [], type: [], location: [], org: 'all' }

/** Custom multi-select dropdown — click trigger to open, click item to toggle */
function MultiSelectDropdown({ label, options, selected, onChange }: {
  label:    string
  options:  { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  const hasActive = selected.length > 0
  const triggerLabel = hasActive
    ? selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} selected`
    : 'All'

  return (
    <div ref={ref} style={{ position: 'relative' as const }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.12s',
          border: `1.5px solid ${hasActive ? C.brand : C.border}`,
          background: hasActive ? C.brandBg : C.surface,
          color: hasActive ? C.brand : C.muted,
          outline: 'none',
          whiteSpace: 'nowrap' as const,
        }}
      >
        <span>{triggerLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute' as const, top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8,
          minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}>
          {options.map(opt => {
            const active = selected.includes(opt.value)
            return (
              <div
                key={opt.value}
                onClick={() => toggle(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  color: active ? C.brand : C.text,
                  background: active ? C.brandBg : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = C.bg }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Checkbox dot */}
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${active ? C.brand : C.faint}`,
                  background: active ? C.brand : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 900,
                }}>
                  {active ? '✓' : ''}
                </span>
                {opt.label}
              </div>
            )
          })}
          {/* Clear row */}
          {selected.length > 0 && (
            <div
              onClick={() => { onChange([]); setOpen(false) }}
              style={{
                padding: '7px 12px', fontSize: 11, fontWeight: 600, color: C.muted,
                borderTop: `1px solid ${C.border}`, cursor: 'pointer',
                background: 'transparent', textAlign: 'center' as const,
              }}
            >
              Clear ✕
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FiltersBar({ filters, onChange, domains, locations, eventTypes }: {
  filters: Filters; onChange: (f: Filters) => void
  domains: string[]; locations: string[]; eventTypes: EventTypeConfig[]
}) {
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const }
  const hasActive = filters.domain.length > 0 || filters.type.length > 0 || filters.location.length > 0 || filters.org !== 'all'

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center', padding: '14px 18px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 20 }}>
      {/* Org pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={lbl}>Org:</span>
        {(['all', 'skelar', 'genesis'] as const).map(o => {
          const active = filters.org === o
          const meta   = o === 'all' ? null : ORG_META[o]
          return (
            <button key={o} onClick={() => onChange({ ...filters, org: o })} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${active ? (meta?.color ?? C.text) : C.border}`, background: active ? (meta?.bg ?? C.surface) : C.surface, color: active ? (meta?.color ?? C.text) : C.muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              {o === 'all' ? 'All' : o.toUpperCase()}
            </button>
          )
        })}
      </div>

      <div style={{ width: 1, height: 20, background: C.border }} />

      {/* Domain dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={lbl}>Domain:</span>
        <MultiSelectDropdown
          label="Domain"
          options={domains.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
          selected={filters.domain}
          onChange={domain => onChange({ ...filters, domain })}
        />
      </div>

      {/* Type dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={lbl}>Type:</span>
        <MultiSelectDropdown
          label="Type"
          options={eventTypes.map(t => ({ value: t.key, label: t.label }))}
          selected={filters.type}
          onChange={type => onChange({ ...filters, type: type as EventType[] })}
        />
      </div>

      {/* Location dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={lbl}>Location:</span>
        <MultiSelectDropdown
          label="Location"
          options={locations.map(l => ({ value: l, label: l }))}
          selected={filters.location}
          onChange={location => onChange({ ...filters, location })}
        />
      </div>

      {/* Global clear */}
      {hasActive && (
        <button onClick={() => onChange(CLEAR_FILTERS)} style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: 'transparent', border: `1px solid ${C.brandBg}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Clear all ✕
        </button>
      )}
    </div>
  )
}

// ── My Events View ────────────────────────────────────────────────────────────
function MyEventsView({ events, onEventClick, todayStr, cfgTypes }: {
  events: CorporateEvent[]
  onEventClick: (e: CorporateEvent) => void
  cfgTypes?: EventTypeConfig[]
  todayStr: string
}) {
  const going      = events.filter(e => e.my_rsvp === 'going')
  const interested = events.filter(e => e.my_rsvp === 'interested')

  const upcoming = (arr: CorporateEvent[]) => arr.filter(e => isoDate(new Date(e.end_at)) >= todayStr).sort((a, b) => a.start_at.localeCompare(b.start_at))
  const past     = (arr: CorporateEvent[]) => arr.filter(e => isoDate(new Date(e.end_at)) <  todayStr).sort((a, b) => b.start_at.localeCompare(a.start_at))

  const totalAttended = past(going).length

  if (!going.length && !interested.length) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '80px 24px', color: C.muted }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>📅</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>No events yet</div>
        <div style={{ fontSize: 14 }}>Browse Upcoming or Calendar to mark events you're going to</div>
      </div>
    )
  }

  function Section({ title, color, items, past: isPast }: { title: string; color: string; items: CorporateEvent[]; past?: boolean }) {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 12 }}>{title} · {items.length}</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {items.map(ev => {
            const tm  = resolveTypeMeta(ev.event_type, cfgTypes)
            const org = ev.organization ? ORG_META[ev.organization] : null
            return (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, opacity: isPast ? 0.65 : 1, transition: 'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.opacity = isPast ? '0.65' : '1' }}
              >
                <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, background: tm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {isPast ? '✓' : ev.event_type === 'course' ? '📚' : ev.event_type === 'lecture' ? '🎓' : ev.event_type === 'intensive' ? '⚡' : '🗓'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 3, lineHeight: 1.4 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <span>🗓 {formatDate(ev.start_at)}</span>
                    {ev.location && <span>📍 {ev.location.split(',').map(s => s.trim()).filter(Boolean).join(' · ')}</span>}
                    {ev.domain && <DomainChip domain={ev.domain} />}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {org && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: org.bg, color: org.color }}>{org.label}</span>}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 4, background: tm.bg, color: tm.color }}>{tm.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Personal stats bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 28 }}>
        {[
          { label: 'Upcoming going',    value: upcoming(going).length,    color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Upcoming interested', value: upcoming(interested).length, color: '#d97706', bg: '#fffbeb' },
          { label: 'Events attended',   value: totalAttended,              color: '#2563EB', bg: '#eff6ff' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <Section title="Going — upcoming"   color="#16a34a" items={upcoming(going)} />
      <Section title="Interested — upcoming" color="#d97706" items={upcoming(interested)} />
      <Section title="Already attended"   color="#2563EB" items={past(going)} past />
      <Section title="Was interested in"  color="#9ca3af" items={past(interested)} past />
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────────
type MainView = 'upcoming' | 'calendar' | 'table' | 'mine'

interface Props {
  events:      CorporateEvent[]
  userId:      string
  name:        string
  role:        string
  isAdmin:     boolean
  config?:     EventConfig
  previewMode?: boolean
}

export function EventsPageClient({ events: initialEvents, userId, name, role, isAdmin, config, previewMode }: Props) {
  const cfgDomains    = config?.domains     ?? [...DOMAINS]
  const cfgLocations  = config?.locations   ?? [...LOCATIONS]
  const cfgTypes      = config?.event_types ?? Object.entries(EVENT_TYPE_META).map(([key, m]) => ({ key, ...m }))
  const today  = new Date()
  const [view,       setView]       = useState<MainView>('upcoming')
  const [calYear,    setCalYear]    = useState(today.getFullYear())
  const [calMonth,   setCalMonth]   = useState(today.getMonth())
  const [filters,    setFilters]    = useState<Filters>(CLEAR_FILTERS)
  const [events,     setEvents]     = useState(initialEvents)
  const [selected,   setSelected]   = useState<CorporateEvent | null>(null)
  const [editTarget, setEditTarget] = useState<Partial<CorporateEvent> | null>(null)
  const [rsvpLoading,setRsvpLoading]= useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  const todayStr = isoDate(today)

  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (ev.status === 'draft' && !isAdmin) return false
      if (filters.org !== 'all' && ev.organization !== filters.org) return false
      if (filters.type.length > 0 && !filters.type.includes(ev.event_type)) return false
      if (filters.domain.length > 0 && !filters.domain.includes(ev.domain ?? '')) return false
      if (filters.location.length > 0) {
        const evLocs = (ev.location ?? '').split(',').map(s => s.trim()).filter(Boolean)
        if (!evLocs.some(loc => filters.location.includes(loc))) return false
      }
      if (view === 'calendar') {
        // Include events that overlap with the displayed month:
        // starts in month, ends in month, or spans through it entirely.
        const monthStart = new Date(calYear, calMonth, 1).getTime()
        const monthEnd   = new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999).getTime()
        if (new Date(ev.end_at).getTime() < monthStart || new Date(ev.start_at).getTime() > monthEnd) return false
      }
      return true
    })
  }, [events, filters, view, calYear, calMonth, isAdmin])

  function prevMonth() { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1) }
  function nextMonth() { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1) }

  const handleRsvp = useCallback(async (status: RsvpStatus | null) => {
    if (!selected) return
    setRsvpLoading(true)
    try {
      const res = await fetch(`/api/events/${selected.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      const updated: CorporateEvent = await res.json()
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
      setSelected(updated)
    } finally { setRsvpLoading(false) }
  }, [selected])

  async function handleSaveEvent(data: Partial<CorporateEvent>) {
    setSaving(true)
    setSaveError(null)
    try {
      const isEdit = !!editTarget?.id
      const res = await fetch(isEdit ? `/api/events/${editTarget!.id}` : '/api/events', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = body?.error ?? `Server error ${res.status}`
        console.error('[handleSaveEvent]', res.status, msg)
        setSaveError(msg)
        return
      }
      const saved: CorporateEvent = await res.json()
      if (isEdit) {
        setEvents(prev => prev.map(e => e.id === saved.id ? saved : e))
        if (selected?.id === saved.id) setSelected(saved)
      } else {
        setEvents(prev => [...prev, saved])
      }
      setEditTarget(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[handleSaveEvent] unexpected:', msg)
      setSaveError(msg)
    } finally { setSaving(false) }
  }

  async function handleDeleteEvent() {
    if (!editTarget?.id) return
    setSaving(true)
    try {
      await fetch(`/api/events/${editTarget.id}`, { method: 'DELETE' })
      setEvents(prev => prev.filter(e => e.id !== editTarget.id))
      if (selected?.id === editTarget.id) setSelected(null)
      setEditTarget(null)
    } finally { setSaving(false) }
  }

  const upcomingCount = events.filter(e => e.status === 'published' && isoDate(new Date(e.end_at)) >= todayStr).length
  const ini           = initials(name)

  const myGoing      = events.filter(e => e.my_rsvp === 'going').length
  const myInterested = events.filter(e => e.my_rsvp === 'interested').length

  const TAB_VIEWS: { key: MainView; label: string; count?: number }[] = [
    { key: 'calendar', label: 'CALENDAR VIEW' },
    { key: 'upcoming', label: 'UPCOMING EVENTS' },
    { key: 'table',    label: 'PAST EVENTS' },
    { key: 'mine',     label: 'MY EVENTS', count: myGoing + myInterested || undefined },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans','Geist',sans-serif", color: C.text }}>

      {/* ── Preview mode banner ── */}
      {previewMode && (
        <div style={{ background: '#1e3a5f', color: '#93c5fd', fontSize: 12, fontWeight: 600, padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, zIndex: 200, borderBottom: '1px solid #1e40af' }}>
          <span>👁 Preview mode — viewing as a regular user (admin controls hidden)</span>
          <Link href="/events/manager" style={{ fontSize: 11, fontWeight: 700, color: '#fff', padding: '4px 12px', background: '#2563EB', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
            ← Back to Manager
          </Link>
        </div>
      )}

      {/* ── Topbar ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 48, background: C.text, borderBottom: `1px solid #333`, position: 'sticky', top: previewMode ? 37 : 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/skelar-mark.png" alt="SKELAR" width={22} height={22} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: '#fff' }}>SKELAR</span>
          </Link>
          <div style={{ width: 1, height: 16, background: '#444' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.brand, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Events</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', border: `1px solid #444`, borderRadius: 20 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{ini}</div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: role === 'admin' ? C.brand : role === 'manager' ? '#2563EB' : '#888', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
              {role.toUpperCase()}
            </span>
          </div>
          {isAdmin && (
            <Link href="/events/manager" style={{ fontSize: 12, fontWeight: 600, color: '#fff', padding: '5px 12px', border: 'none', borderRadius: 6, background: C.brand, textDecoration: 'none' }}>
              Manager
            </Link>
          )}
          {isAdmin && (
            <a href="/admin/users" style={{ fontSize: 12, fontWeight: 600, color: '#aaa', padding: '5px 10px', border: '1px solid #444', borderRadius: 6, textDecoration: 'none' }}>
              Admin
            </a>
          )}
          <a href="/auth/logout" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: '1px solid #444', borderRadius: 6, background: 'transparent', fontSize: 12, fontWeight: 500, color: '#aaa', textDecoration: 'none' }}>
            Log out
          </a>
        </div>
      </nav>

      {/* ── Header block ── */}
      <div style={{ background: C.text, color: '#fff', padding: '28px 24px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: '#ddd' }}>
            Employer branding &amp; education initiatives
          </h1>
          <div style={{ marginBottom: 16 }} />
          {/* View tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TAB_VIEWS.map(({ key, label, count }) => (
              <button key={key} onClick={() => setView(key)} style={{
                padding: '8px 18px', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em',
                border: `1px solid ${view === key ? '#fff' : '#555'}`,
                borderRadius: key === 'calendar' ? '6px 0 0 6px' : key === 'mine' ? '0 6px 6px 0' : '0',
                background: view === key ? '#fff' : 'transparent',
                color: view === key ? C.text : '#aaa',
                cursor: 'pointer', fontFamily: 'inherit',
                marginLeft: key === 'calendar' ? 0 : -1,
                position: 'relative', zIndex: view === key ? 1 : 0,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {label}
                {count !== undefined && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 9, background: view === key ? C.brand : '#ffffff33', color: view === key ? '#fff' : '#ddd' }}>{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>

        {view !== 'mine' && <FiltersBar filters={filters} onChange={setFilters} domains={cfgDomains} locations={cfgLocations} eventTypes={cfgTypes} />}

        {/* Calendar month nav */}
        {view === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>EVENT CALENDAR</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={prevMonth} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 3L4 6l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 140, textAlign: 'center' as const }}>
                {MONTHS_EN()[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <button onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                Current Month
              </button>
              {isAdmin && (
                <button onClick={() => setEditTarget({})} style={{ ...btnStyle('none', C.brand, '#fff', true), marginLeft: 8 }}>+ New event</button>
              )}
            </div>
          </div>
        )}

        {view === 'table' && (
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>PAST EVENTS</h2>
        )}

        {view === 'calendar' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <MonthCalendar events={filtered} year={calYear} month={calMonth} onEventClick={setSelected} cfgTypes={cfgTypes} />
          </div>
        )}

        {view === 'upcoming' && (
          <UpcomingView events={filtered} onEventClick={setSelected} canEdit={isAdmin} onNewEvent={() => setEditTarget({})} teams={config?.teams ?? []} cfgTypes={cfgTypes} />
        )}

        {view === 'table' && (
          <AllEventsTable events={filtered} onEventClick={setSelected} cfgTypes={cfgTypes} />
        )}

        {view === 'mine' && (
          <MyEventsView events={events} onEventClick={setSelected} todayStr={todayStr} cfgTypes={cfgTypes} />
        )}

        {config?.contact_email && (
          <div style={{ marginTop: 32, padding: '14px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>✉️</span>
            <span style={{ fontSize: 13, color: C.muted }}>Questions about this platform?</span>
            <a href={`mailto:${config.contact_email}`} style={{ fontSize: 13, fontWeight: 600, color: C.brand, textDecoration: 'none' }}>
              {config.contact_email}
            </a>
          </div>
        )}

      </main>

      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)} onRsvp={handleRsvp} rsvpLoading={rsvpLoading} canEdit={isAdmin} onEdit={() => { setEditTarget(selected); setSelected(null) }} teams={config?.teams ?? []} customTypes={cfgTypes} />
      )}

      {editTarget !== null && (
        <AdminEventForm initial={editTarget} onSave={handleSaveEvent} onDelete={editTarget.id ? handleDeleteEvent : undefined} onClose={() => { setEditTarget(null); setSaveError(null) }} saving={saving} saveError={saveError} domains={cfgDomains} locations={cfgLocations} eventTypes={cfgTypes} teams={config?.teams ?? []} />
      )}
    </div>
  )
}
