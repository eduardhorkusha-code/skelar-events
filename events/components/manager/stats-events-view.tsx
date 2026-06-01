'use client'
import React, { useState } from 'react'
import type { Organization } from '../../types'
import { C, formatShort } from './shared'
import { RichEvent, engagementFlag } from './stats-tab'
import { OrgChip } from './ui-atoms'

interface Attendee {
  user_id: string; rsvp_status: string; full_name: string; email: string; rsvped_at: string
}

const th: React.CSSProperties = {
  padding: '9px 12px', fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left',
  borderBottom: `2px solid ${C.border}`, background: C.bg, whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border2}`, verticalAlign: 'middle',
}

export function StatsEventsView({
  engagementEvents, insightFilter, setInsightFilter,
  zeroRsvpEvents, mostPopularEvent, avgGoing, avgEngagement, publishedCount,
}: {
  engagementEvents: RichEvent[]
  insightFilter:    'zero' | 'popular' | null
  setInsightFilter: (v: 'zero' | 'popular' | null) => void
  zeroRsvpEvents:   RichEvent[]
  mostPopularEvent: RichEvent | null
  avgGoing:         string
  avgEngagement:    number
  publishedCount:   number
}) {
  const [openAttendees, setOpenAttendees] = useState<string | null>(null)
  const [attendees,     setAttendees]     = useState<Record<string, Attendee[]>>({})
  const [loadingId,     setLoadingId]     = useState<string | null>(null)

  async function toggleAttendees(id: string) {
    if (openAttendees === id) { setOpenAttendees(null); return }
    setOpenAttendees(id)
    if (attendees[id]) return
    setLoadingId(id)
    try {
      const res = await fetch(`/api/events/${id}/attendees`)
      if (res.ok) {
        const data: Attendee[] = await res.json()
        setAttendees(prev => ({ ...prev, [id]: data }))
      }
    } finally { setLoadingId(null) }
  }

  function copyEmails(list: Attendee[]) {
    navigator.clipboard.writeText(list.map(a => a.email).filter(Boolean).join(', '))
  }

  return (
    <>
      {/* Insight cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {/* Most popular */}
        <div
          onClick={() => setInsightFilter(insightFilter === 'popular' ? null : 'popular')}
          style={{ padding: '14px 16px', background: insightFilter === 'popular' ? C.greenBg : C.surface, border: `1.5px solid ${insightFilter === 'popular' ? C.green : C.border}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Most popular</div>
          {mostPopularEvent ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.35, marginBottom: 4 }}>{mostPopularEvent.title}</div>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{Number(mostPopularEvent.going_count)} going · {Number(mostPopularEvent.interested_count)} interested</div>
            </>
          ) : <div style={{ fontSize: 12, color: C.faint }}>No published events</div>}
          <div style={{ marginTop: 6, fontSize: 10, color: insightFilter === 'popular' ? C.green : C.muted, fontWeight: 600 }}>
            {insightFilter === 'popular' ? 'Showing below · click to reset' : 'Click to highlight →'}
          </div>
        </div>

        {/* Zero RSVPs */}
        <div
          onClick={() => setInsightFilter(insightFilter === 'zero' ? null : 'zero')}
          style={{ padding: '14px 16px', background: insightFilter === 'zero' ? C.brandBg : C.surface, border: `1.5px solid ${insightFilter === 'zero' ? C.brand : C.border}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: C.brand, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Zero RSVPs</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.brand }}>{zeroRsvpEvents.length}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>published event{zeroRsvpEvents.length !== 1 ? 's' : ''} with no sign-ups</div>
          <div style={{ marginTop: 6, fontSize: 10, color: insightFilter === 'zero' ? C.brand : C.muted, fontWeight: 600 }}>
            {insightFilter === 'zero' ? 'Showing below · click to reset' : 'Click to see list →'}
          </div>
        </div>

        {/* Avg going */}
        <div style={{ padding: '14px 16px', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#2563EB', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Avg going / event</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#2563EB' }}>{avgGoing}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>avg going per published event</div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.muted }}>Engagement rate: <strong style={{ color: '#2563EB' }}>{avgEngagement}%</strong> going vs interested</div>
        </div>

        {/* Coverage */}
        <div style={{ padding: '14px 16px', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>RSVP coverage</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#7C3AED' }}>
            {publishedCount > 0 ? Math.round(((publishedCount - zeroRsvpEvents.length) / publishedCount) * 100) : 0}%
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>of published events have RSVPs</div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.muted }}>{publishedCount - zeroRsvpEvents.length} of {publishedCount} events</div>
        </div>
      </div>

      {/* Engagement tracking table */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          Engagement tracking — {engagementEvents.length} event{engagementEvents.length !== 1 ? 's' : ''}
          {insightFilter && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: insightFilter === 'zero' ? C.brandBg : C.greenBg, color: insightFilter === 'zero' ? C.brand : C.green }}>
              {insightFilter === 'zero' ? 'Zero RSVPs filter' : 'Most popular'}
              <button onClick={() => setInsightFilter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, fontSize: 12, color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>Click row to see attendee contacts</div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
        {!engagementEvents.length ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 13 }}>No published events in selected period</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Event</th>
                <th style={th}>Date</th>
                <th style={th}>Going</th>
                <th style={th}>Interested</th>
                <th style={th}>Engagement</th>
                <th style={th}>Contacts</th>
              </tr>
            </thead>
            <tbody>
              {engagementEvents.map(ev => {
                const flag   = engagementFlag(ev)
                const total  = Number(ev.going_count) + Number(ev.interested_count)
                const isOpen = openAttendees === ev.id
                const list   = attendees[ev.id]
                return (
                  <React.Fragment key={ev.id}>
                    <tr style={{ background: isOpen ? C.bg : C.surface, cursor: 'pointer' }} onClick={() => toggleAttendees(ev.id)}>
                      <td style={{ ...td, fontWeight: 600, maxWidth: 260 }}>
                        <div style={{ lineHeight: 1.35 }}>{ev.title}</div>
                        {ev.organization && <OrgChip org={ev.organization as Organization | null} />}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{formatShort(ev.start_at)}</td>
                      <td style={{ ...td, fontWeight: 700, color: C.green }}>{Number(ev.going_count)}</td>
                      <td style={{ ...td, fontWeight: 700, color: C.yellow }}>{Number(ev.interested_count)}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: flag.bg, color: flag.color, whiteSpace: 'nowrap' }}>
                          {flag.label}{total > 0 && ` · ${Math.round(Number(ev.going_count) / total * 100)}%`}
                        </span>
                      </td>
                      <td style={td}>
                        <button
                          onClick={e => { e.stopPropagation(); toggleAttendees(ev.id) }}
                          style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: isOpen ? C.text : C.surface, color: isOpen ? '#fff' : C.text, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {loadingId === ev.id ? '…' : isOpen ? 'Close' : `View ${total}`}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${ev.id}-att`}>
                        <td colSpan={6} style={{ padding: '0 0 0 24px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ padding: '14px 16px 14px 0' }}>
                            {!list ? (
                              <div style={{ fontSize: 12, color: C.muted }}>Loading…</div>
                            ) : !list.length ? (
                              <div style={{ fontSize: 12, color: C.muted }}>No RSVPs yet</div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{list.length} respondents</span>
                                  <button
                                    onClick={() => copyEmails(list)}
                                    style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.blue, cursor: 'pointer', fontFamily: 'inherit' }}
                                  >
                                    Copy emails
                                  </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {list.map(a => (
                                    <div key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: a.rsvp_status === 'going' ? C.greenBg : C.yellowBg, color: a.rsvp_status === 'going' ? C.green : C.yellow }}>
                                        {a.rsvp_status === 'going' ? '✓' : '★'}
                                      </span>
                                      <span style={{ fontWeight: 600 }}>{a.full_name}</span>
                                      <span style={{ color: C.muted }}>{a.email}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
