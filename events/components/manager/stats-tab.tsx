'use client'
import React, { useState } from 'react'
import type { TeamConfig } from '../../types'
import { parseTeamMember } from '../../types'
import { C, ExistingEvent, isoDate } from './shared'
import { StatsEventsView } from './stats-events-view'
import { StatsPeopleView } from './stats-people-view'

export interface RichEvent extends ExistingEvent {
  going_count:      number
  interested_count: number
  capacity:         number | null
  team_members:     string[] | null
  event_type:       string | null
  location:         string | null
}

export function engagementFlag(ev: RichEvent): { color: string; bg: string; label: string } {
  const total = ev.going_count + ev.interested_count
  if (total === 0) return { color: C.brand, bg: C.brandBg, label: 'No RSVPs' }
  const ratio = ev.going_count / total
  if (ratio < 0.3) return { color: C.yellow,   bg: C.yellowBg, label: 'Needs push' }
  if (ratio < 0.6) return { color: '#2563EB', bg: '#eff6ff',   label: 'Moderate'   }
  return { color: C.green, bg: C.greenBg, label: 'Good' }
}

export function StatsTab({ events, teams }: { events: RichEvent[]; teams: TeamConfig[] }) {
  const now = new Date()

  const [statView,      setStatView]      = useState<'events' | 'people'>('events')
  const [insightFilter, setInsightFilter] = useState<'zero' | 'popular' | null>(null)

  // Date range
  const today = isoDate(now)
  const [rangeFrom,    setRangeFrom]    = useState('2020-01-01')
  const [rangeTo,      setRangeTo]      = useState('2099-12-31')
  const [monthCursor,  setMonthCursor]  = useState({ year: now.getFullYear(), month: now.getMonth() })

  const PRESETS = [
    { label: 'Last 3 months', from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today },
    { label: 'This year',     from: `${now.getFullYear()}-01-01`, to: today },
    { label: 'All time',      from: '2020-01-01', to: '2099-12-31' },
  ]

  function goToMonth(year: number, month: number) {
    setMonthCursor({ year, month })
    setRangeFrom(isoDate(new Date(year, month, 1)))
    setRangeTo(isoDate(new Date(year, month + 1, 0)))
  }
  function prevMonth() {
    const { year, month } = monthCursor
    goToMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)
  }
  function nextMonth() {
    const { year, month } = monthCursor
    goToMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)
  }
  const monthLabel = new Date(monthCursor.year, monthCursor.month, 1)
    .toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
  const isMonthActive =
    rangeFrom === isoDate(new Date(monthCursor.year, monthCursor.month, 1)) &&
    rangeTo   === isoDate(new Date(monthCursor.year, monthCursor.month + 1, 0))

  // Derived data
  const rangeEvents = events.filter(e =>
    e.status !== 'deleted' &&
    e.start_at.slice(0, 10) >= rangeFrom &&
    e.start_at.slice(0, 10) <= rangeTo
  )
  const publishedCount = rangeEvents.filter(e => e.status === 'published').length
  const draftsCount    = rangeEvents.filter(e => e.status === 'draft').length
  const totalGoing     = rangeEvents.reduce((s, e) => s + Number(e.going_count),      0)
  const totalInt       = rangeEvents.reduce((s, e) => s + Number(e.interested_count), 0)

  const publishedEvents       = rangeEvents.filter(e => e.status === 'published')
  const engagementEventsBase  = publishedEvents.sort((a, b) => a.start_at.localeCompare(b.start_at))
  const zeroRsvpEvents        = publishedEvents.filter(e => Number(e.going_count) + Number(e.interested_count) === 0)
  const mostPopularEvent      = publishedEvents.length
    ? publishedEvents.reduce((best, e) =>
        Number(e.going_count) + Number(e.interested_count) > Number(best.going_count) + Number(best.interested_count) ? e : best
      )
    : null
  const avgGoing = publishedEvents.length > 0
    ? (totalGoing / publishedEvents.length).toFixed(1)
    : '0'
  const avgEngagement = publishedEvents.length > 0
    ? Math.round((totalGoing / (totalGoing + totalInt || 1)) * 100)
    : 0

  const engagementEvents = insightFilter === 'zero'
    ? zeroRsvpEvents
    : insightFilter === 'popular' && mostPopularEvent
      ? [mostPopularEvent]
      : engagementEventsBase

  // Person analytics
  const personMap = new Map<string, { name: string; team: string | null; count: number; events: { title: string; start_at: string }[] }>()
  rangeEvents.forEach(ev => {
    ;(ev.team_members ?? []).forEach(m => {
      const p = parseTeamMember(m)
      if (!personMap.has(p.name)) personMap.set(p.name, { name: p.name, team: p.team, count: 0, events: [] })
      const entry = personMap.get(p.name)!
      entry.count++
      entry.events.push({ title: ev.title, start_at: ev.start_at })
    })
  })
  const persons = [...personMap.values()].sort((a, b) => b.count - a.count)

  const dateInp: React.CSSProperties = {
    padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 7,
    fontSize: 12, fontFamily: 'inherit', color: C.text, background: C.surface,
    outline: 'none', cursor: 'pointer',
  }

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
        {(['events', 'people'] as const).map(v => (
          <button key={v} onClick={() => { setStatView(v); setInsightFilter(null) }}
            style={{ padding: '8px 22px', fontSize: 12, fontWeight: 700, border: 'none', borderRight: v === 'events' ? `1px solid ${C.border}` : 'none', background: statView === v ? C.text : C.surface, color: statView === v ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            {v === 'events' ? 'Events' : 'People'}
          </button>
        ))}
      </div>

      {/* Date range picker */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Period:</span>
          <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${isMonthActive ? C.brand : C.border}`, borderRadius: 8, overflow: 'hidden', background: isMonthActive ? C.brandBg : C.surface }}>
            <button onClick={prevMonth} style={{ padding: '5px 11px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: isMonthActive ? C.brand : C.muted, lineHeight: 1, fontFamily: 'inherit' }}>‹</button>
            <button
              onClick={() => goToMonth(monthCursor.year, monthCursor.month)}
              style={{ padding: '5px 14px', borderLeft: `1px solid ${isMonthActive ? C.brand + '44' : C.border}`, borderRight: `1px solid ${isMonthActive ? C.brand + '44' : C.border}`, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: isMonthActive ? C.brand : C.text, fontFamily: 'inherit', whiteSpace: 'nowrap' as const, textTransform: 'capitalize' as const }}
            >
              {monthLabel}
            </button>
            <button onClick={nextMonth} style={{ padding: '5px 11px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: isMonthActive ? C.brand : C.muted, lineHeight: 1, fontFamily: 'inherit' }}>›</button>
          </div>
          {PRESETS.map(p => {
            const active = rangeFrom === p.from && rangeTo === p.to
            return (
              <button key={p.label} onClick={() => { setRangeFrom(p.from); setRangeTo(p.to) }}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${active ? C.brand : C.border}`, background: active ? C.brandBg : C.surface, color: active ? C.brand : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                {p.label}
              </button>
            )
          })}
          <span style={{ fontSize: 11, color: C.faint }}>or</span>
          <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} style={dateInp} />
          <span style={{ fontSize: 11, color: C.muted }}>—</span>
          <input type="date" value={rangeTo}   onChange={e => setRangeTo(e.target.value)}   style={dateInp} />
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          Showing: <strong style={{ color: C.text }}>{rangeFrom === '2020-01-01' && rangeTo === '2099-12-31' ? 'All time' : `${rangeFrom} → ${rangeTo}`}</strong>
          {' · '}{rangeEvents.length} event{rangeEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total events', value: rangeEvents.length, color: C.text,    bg: C.bg       },
            { label: 'Published',    value: publishedCount,     color: C.green,   bg: C.greenBg  },
            { label: 'Drafts',       value: draftsCount,        color: C.yellow,  bg: C.yellowBg },
            { label: 'Going RSVPs',  value: totalGoing,         color: '#2563EB', bg: '#eff6ff'  },
            { label: 'Interested',   value: totalInt,           color: C.yellow,  bg: C.yellowBg },
          ].map(s => (
            <div key={s.label} style={{ padding: '12px 18px', background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10, minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-views */}
      {statView === 'events' && (
        <StatsEventsView
          engagementEvents={engagementEvents}
          insightFilter={insightFilter}
          setInsightFilter={setInsightFilter}
          zeroRsvpEvents={zeroRsvpEvents}
          mostPopularEvent={mostPopularEvent}
          avgGoing={avgGoing}
          avgEngagement={avgEngagement}
          publishedCount={publishedCount}
        />
      )}
      {statView === 'people' && (
        <StatsPeopleView persons={persons} teams={teams} />
      )}
    </div>
  )
}
