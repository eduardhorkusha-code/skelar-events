'use client'
import React, { useState } from 'react'
import type { EventType, Organization, TeamConfig, RecurrenceRule, RecurrenceFrequency, RecurrenceEndType, RecurrenceDayOfWeek, IntensiveMilestone } from '../../types'
import { EVENT_TYPE_META, ORG_META, DOMAINS } from '../../types'
import { C, ExistingEvent, isoDate, inp } from './shared'
import { TeamMemberPicker } from './ui-atoms'
import { recurrenceLabel } from '../../lib/recurrence'

const DOW_LIST: { key: RecurrenceDayOfWeek; label: string }[] = [
  { key: 'Mon', label: 'M' },
  { key: 'Tue', label: 'T' },
  { key: 'Wed', label: 'W' },
  { key: 'Thu', label: 'T' },
  { key: 'Fri', label: 'F' },
  { key: 'Sat', label: 'S' },
  { key: 'Sun', label: 'S' },
]

export function CreateEventForm({ onClose, onCreated, teams, locationOptions }: {
  onClose: () => void
  onCreated: (ev: ExistingEvent) => void
  teams: TeamConfig[]
  locationOptions: string[]
}) {
  const [title,          setTitle]          = useState('')
  const [eventType,      setEventType]      = useState<EventType>('event')
  const [organization,   setOrganization]   = useState<Organization | ''>('')
  const [domain,         setDomain]         = useState('')
  const [locations,      setLocations]      = useState<string[]>([])
  const [startDate,      setStartDate]      = useState(isoDate(new Date()))
  const [startTime,      setStartTime]      = useState('10:00')
  const [endDate,        setEndDate]        = useState(isoDate(new Date()))
  const [endTime,        setEndTime]        = useState('12:00')
  const [description,    setDescription]    = useState('')
  const [participantsUrl,setParticipantsUrl]= useState('')
  const [registrationUrl,setRegistrationUrl]= useState('')
  const [landingUrl,     setLandingUrl]     = useState('')
  const [teamMembers,    setTeamMembers]    = useState<string[]>([])
  const [capacity,       setCapacity]       = useState('')
  const [asPublished,    setAsPublished]    = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  // ── Intensive milestones state ────────────────────────────────────────────────
  const [milestones, setMilestones] = useState<{ start: string; shortlist: string; final: string }>({
    start: '', shortlist: '', final: '',
  })

  // ── Recurrence state ──────────────────────────────────────────────────────────
  const [recEnabled,    setRecEnabled]    = useState(false)
  const [recFreq,       setRecFreq]       = useState<RecurrenceFrequency>('weekly')
  const [recDays,       setRecDays]       = useState<RecurrenceDayOfWeek[]>([])
  const [recEndType,    setRecEndType]    = useState<RecurrenceEndType>('never')
  const [recCount,      setRecCount]      = useState('10')
  const [recUntil,      setRecUntil]      = useState('')

  function buildRecurrenceRule(): RecurrenceRule | null {
    if (!recEnabled) return null
    const rule: RecurrenceRule = {
      frequency: recFreq,
      end_type:  recEndType,
    }
    if ((recFreq === 'weekly' || recFreq === 'biweekly') && recDays.length > 0) {
      rule.days_of_week = recDays
    }
    if (recEndType === 'count' && recCount) {
      rule.count = parseInt(recCount)
    }
    if (recEndType === 'date' && recUntil) {
      rule.until = recUntil
    }
    return rule
  }

  function toggleDay(day: RecurrenceDayOfWeek) {
    setRecDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError(null)
    try {
      const recurrenceRule = buildRecurrenceRule()
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          event_type:       eventType,
          organization:     organization || null,
          domain:           domain || null,
          location:         locations.length > 0 ? locations.join(', ') : null,
          start_at:         `${startDate}T${startTime}:00Z`,
          end_at:           `${endDate || startDate}T${endTime}:00Z`,
          description:      description || null,
          participants_url: participantsUrl || null,
          registration_url: registrationUrl || null,
          landing_url:      landingUrl || null,
          team_members:     teamMembers.length > 0 ? teamMembers : null,
          capacity:         capacity ? parseInt(capacity) : null,
          status:           asPublished ? 'published' : 'draft',
          ...(recurrenceRule ? { recurrence_rule: recurrenceRule } : {}),
          intensive_milestones: eventType === 'intensive' && (milestones.start || milestones.shortlist || milestones.final)
            ? (
                [
                  milestones.start     ? { label: 'Start',      date: new Date(milestones.start).toISOString() }     : null,
                  milestones.shortlist ? { label: 'Short list',  date: new Date(milestones.shortlist).toISOString() } : null,
                  milestones.final     ? { label: 'Final',       date: new Date(milestones.final).toISOString() }     : null,
                ] as (IntensiveMilestone | null)[]
              ).filter((x): x is IntensiveMilestone => x !== null)
            : null,
        }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Save failed'); return }
      const saved = await res.json()
      onCreated(saved)
      onClose()
    } finally { setSaving(false) }
  }

  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: C.surface, display: 'flex', flexDirection: 'column', overflow: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>New Event</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: C.brandBg, border: `1px solid ${C.brand}33`, fontSize: 13, color: C.brand }}>{error}</div>}

          <div>
            <span style={lbl}>Title *</span>
            <input style={inp()} value={title} onChange={e => setTitle(e.target.value)} placeholder="IT School XVI…" autoFocus />
          </div>

          <div>
            <span style={lbl}>Type</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([t, m]) => (
                <button key={t} onClick={() => setEventType(t)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${eventType === t ? m.color : C.border}`, background: eventType === t ? m.bg : C.surface, color: eventType === t ? m.color : C.text, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m.label}
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

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Domain</span>
              <select style={inp({ padding: '8px 11px' })} value={domain} onChange={e => setDomain(e.target.value)}>
                <option value="">— None —</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Location <span style={{ fontWeight: 400, color: C.faint }}>(pick one or more)</span></span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                {locationOptions.map(loc => {
                  const active = locations.includes(loc)
                  return (
                    <button key={loc} type="button"
                      onClick={() => setLocations(active ? locations.filter(l => l !== loc) : [...locations, loc])}
                      style={{ padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1.5px solid ${active ? C.blue : C.border}`, background: active ? C.blueBg : C.surface, color: active ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {active ? '✓ ' : ''}{loc}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <span style={lbl}>Start</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" style={inp({ flex: 2 })} value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} />
              <input type="time" style={inp({ flex: 1 })} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
          </div>

          <div>
            <span style={lbl}>End</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" style={inp({ flex: 2 })} value={endDate || startDate} onChange={e => setEndDate(e.target.value)} />
              <input type="time" style={inp({ flex: 1 })} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* ── Recurrence picker ── */}
          <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' as const }}>
              <input type="checkbox" checked={recEnabled} onChange={e => setRecEnabled(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Repeat event</span>
            </label>

            {recEnabled && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                {/* Frequency */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, minWidth: 70 }}>Frequency</span>
                  <select
                    value={recFreq}
                    onChange={e => { setRecFreq(e.target.value as RecurrenceFrequency); setRecDays([]) }}
                    style={inp({ width: 'auto', padding: '6px 10px' })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Days of week (weekly / biweekly only) */}
                {(recFreq === 'weekly' || recFreq === 'biweekly') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, minWidth: 70 }}>Days</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {DOW_LIST.map(({ key, label }) => {
                        const active = recDays.includes(key)
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleDay(key)}
                            title={key}
                            style={{
                              width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                              border: `1.5px solid ${active ? C.brand : C.border}`,
                              background: active ? C.brand : C.surface,
                              color: active ? '#fff' : C.muted,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* End condition */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Ends</span>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, paddingLeft: 4 }}>
                    {([ ['never', 'Never'] as const, ['count', 'After'] as const, ['date', 'On date'] as const ]).map(([val, label]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="radio"
                          name="recEndType"
                          value={val}
                          checked={recEndType === val}
                          onChange={() => setRecEndType(val)}
                        />
                        <span>{label}</span>
                        {val === 'count' && recEndType === 'count' && (
                          <input
                            type="number"
                            min={1}
                            value={recCount}
                            onChange={e => setRecCount(e.target.value)}
                            style={inp({ width: 70, padding: '4px 8px' })}
                          />
                        )}
                        {val === 'count' && recEndType === 'count' && (
                          <span style={{ fontSize: 12, color: C.muted }}>times</span>
                        )}
                        {val === 'date' && recEndType === 'date' && (
                          <input
                            type="date"
                            value={recUntil}
                            onChange={e => setRecUntil(e.target.value)}
                            style={inp({ width: 150, padding: '4px 8px' })}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preview label */}
                {(() => {
                  const rule = buildRecurrenceRule()
                  if (!rule) return null
                  return (
                    <div style={{ fontSize: 12, color: C.blue, background: C.blueBg, border: `1px solid ${C.blue}22`, borderRadius: 7, padding: '7px 12px' }}>
                      {recurrenceLabel(rule)}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* ── Intensive milestone dates ── */}
          {eventType === 'intensive' && (
            <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 16 }}>
              <span style={lbl}>Ключові дати інтенсиву</span>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {([
                  { key: 'start',     label: 'Start' },
                  { key: 'shortlist', label: 'Short list' },
                  { key: 'final',     label: 'Final' },
                ] as const).map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e', minWidth: 72, flexShrink: 0 }}>{label}</span>
                    <input
                      type="datetime-local"
                      value={milestones[key]}
                      onChange={e => setMilestones(prev => ({ ...prev, [key]: e.target.value }))}
                      style={inp({ flex: 1 })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <span style={lbl}>Description</span>
            <textarea style={{ ...inp(), height: 80, resize: 'vertical' as const }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What to expect…" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Capacity</span>
              <input type="number" style={inp()} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="50" min="1" />
            </div>
            <div style={{ flex: 2 }}>
              <span style={lbl}>Participants URL</span>
              <input style={inp()} value={participantsUrl} onChange={e => setParticipantsUrl(e.target.value)} placeholder="https://notion.so/…" />
            </div>
          </div>

          <div>
            <span style={lbl}>Registration URL <span style={{ fontWeight: 400, color: C.faint }}>(for businesses)</span></span>
            <input style={inp()} value={registrationUrl} onChange={e => setRegistrationUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <span style={lbl}>Landing URL</span>
            <input style={inp()} value={landingUrl} onChange={e => setLandingUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <span style={lbl}>Responsible persons</span>
            <TeamMemberPicker value={teamMembers} onChange={setTeamMembers} teams={teams} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={asPublished} onChange={e => setAsPublished(e.target.checked)} />
            Publish immediately
          </label>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            style={{ fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 7, border: 'none', background: title.trim() ? C.brand : C.faint, color: '#fff', cursor: title.trim() && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {saving ? 'Saving…' : asPublished ? 'Create & Publish' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}
