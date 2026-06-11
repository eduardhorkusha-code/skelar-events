'use client'
import React from 'react'
import type { EventConfig, IntensiveMilestone } from '../../types'
import { LOCATIONS } from '../../types'
import { C } from './shared'
import { RichEvent } from './stats-tab'
import { TeamMemberPicker } from './ui-atoms'
import { CellText, CellNumber, CellSelect, CellDate, CellState } from './edit-cells'

export type { CellState }

const th: React.CSSProperties = {
  padding: '9px 10px', fontSize: 10, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left',
  borderBottom: `2px solid ${C.border}`, background: C.bg, whiteSpace: 'nowrap' as const,
}
const td: React.CSSProperties = {
  padding: 0, fontSize: 13, borderBottom: `1px solid ${C.border2}`, verticalAlign: 'middle',
}

const statusOpts = [
  { value: 'draft',     label: 'Draft',     color: C.yellow, bg: C.yellowBg },
  { value: 'published', label: 'Published', color: C.green,  bg: C.greenBg  },
]
const orgOpts = [
  { value: 'skelar',  label: 'SKELAR',  color: C.brand, bg: C.brandBg },
  { value: 'genesis', label: 'GENESIS', color: C.blue,  bg: C.blueBg  },
]

export function EditTable({
  filtered, config, savingId, cs,
}: {
  filtered:  RichEvent[]
  config:    EventConfig
  savingId:  string | null
  cs:        CellState
}) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 44, textAlign: 'center' as const }}></th>
              <th style={{ ...th, minWidth: 240 }}>Title</th>
              <th style={{ ...th, minWidth: 112 }}>Status</th>
              <th style={{ ...th, minWidth: 102 }}>Org</th>
              <th style={{ ...th, minWidth: 100 }}>Type</th>
              <th style={{ ...th, minWidth: 110 }}>Domain</th>
              <th style={{ ...th, minWidth: 130 }}>Location</th>
              <th style={{ ...th, minWidth: 88 }}>Start</th>
              <th style={{ ...th, minWidth: 88 }}>End</th>
              <th style={{ ...th, width: 56, textAlign: 'center' as const }}>Going</th>
              <th style={{ ...th, width: 56, textAlign: 'center' as const }}>Int.</th>
              <th style={{ ...th, width: 64 }}>Cap.</th>
              <th style={{ ...th, minWidth: 160 }}>Reg. URL</th>
              <th style={{ ...th, minWidth: 160 }}>Landing URL</th>
              <th style={{ ...th, minWidth: 160 }}>Participants URL</th>
              <th style={{ ...th, minWidth: 200 }}>Description</th>
              <th style={{ ...th, minWidth: 100 }}>Team</th>
              <th style={{ ...th, minWidth: 90 }}>Milestones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev, i) => {
              const typeOpts   = config.event_types.map(t => ({ value: t.key, label: t.label, color: t.color, bg: t.bg }))
              const domainOpts = config.domains.map(d => ({ value: d, label: d, color: C.blue, bg: C.blueBg }))
              const isSaving   = savingId === ev.id
              const rowBg      = i % 2 === 0 ? C.surface : C.bg

              return (
                <React.Fragment key={ev.id}>
                  <tr style={{ background: isSaving ? '#fffef0' : rowBg, transition: 'background 0.15s' }}>
                    <td style={{ ...td, width: 44, textAlign: 'center' as const }}>
                      <a
                        href={`/events?edit=${ev.id}`}
                        title="Open full edit form"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 6,
                          background: 'transparent', border: `1px solid ${C.border}`,
                          color: C.muted, textDecoration: 'none', fontSize: 14, cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        ✏️
                      </a>
                    </td>
                    <td style={{ ...td, minWidth: 240 }}>
                      <CellText id={ev.id} field="title" value={ev.title} style={{ fontWeight: 600 }} cs={cs} />
                    </td>
                    <td style={td}>
                      <CellSelect id={ev.id} field="status" value={ev.status} options={statusOpts} placeholder="Status" cs={cs} />
                    </td>
                    <td style={td}>
                      <CellSelect id={ev.id} field="organization" value={ev.organization} options={orgOpts} cs={cs} />
                    </td>
                    <td style={td}>
                      <CellSelect id={ev.id} field="event_type" value={ev.event_type} options={typeOpts} cs={cs} />
                    </td>
                    <td style={td}>
                      <CellSelect id={ev.id} field="domain" value={ev.domain} options={domainOpts} cs={cs} />
                    </td>
                    <td
                      style={{ ...td, cursor: 'pointer' }}
                      onClick={() => { cs.setEditLocationId(cs.editLocationId === ev.id ? null : ev.id); cs.setEditTeamId(null) }}
                    >
                      <div style={{ padding: '5px 8px', minHeight: 36, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' as const }}>
                        {ev.location
                          ? ev.location.split(',').map(s => s.trim()).filter(Boolean).map((loc, li) => (
                            <span key={li} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: cs.editLocationId === ev.id ? C.blueBg : C.bg, color: cs.editLocationId === ev.id ? C.blue : C.muted, border: `1px solid ${cs.editLocationId === ev.id ? C.blue + '44' : C.border}`, whiteSpace: 'nowrap' as const }}>{loc}</span>
                          ))
                          : <span style={{ fontSize: 11, color: C.faint }}>+ Add</span>
                        }
                      </div>
                    </td>
                    <td style={td}><CellDate id={ev.id} field="start_at" value={ev.start_at} cs={cs} /></td>
                    <td style={td}><CellDate id={ev.id} field="end_at"   value={ev.end_at}   cs={cs} /></td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: C.green, fontSize: 14 }}>
                      {ev.going_count}
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: C.blue, fontSize: 13 }}>
                      {ev.interested_count}
                    </td>
                    <td style={td}>
                      <CellNumber id={ev.id} field="capacity" value={ev.capacity} cs={cs} />
                    </td>
                    <td style={td}>
                      <CellText id={ev.id} field="registration_url"  value={(ev as unknown as { registration_url?: string | null }).registration_url ?? null}  placeholder="https://…" cs={cs} />
                    </td>
                    <td style={td}>
                      <CellText id={ev.id} field="landing_url"       value={(ev as unknown as { landing_url?: string | null }).landing_url ?? null}            placeholder="https://…" cs={cs} />
                    </td>
                    <td style={td}>
                      <CellText id={ev.id} field="participants_url"  value={(ev as unknown as { participants_url?: string | null }).participants_url ?? null}   placeholder="https://…" cs={cs} />
                    </td>
                    <td style={td}>
                      <CellText id={ev.id} field="description"       value={(ev as unknown as { description?: string | null }).description ?? null}            placeholder="Event description…" cs={cs} />
                    </td>
                    <td style={{ ...td, maxWidth: 140 }}>
                      <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', minHeight: 36 }}>
                        <button
                          onClick={() => { cs.setEditTeamId(cs.editTeamId === ev.id ? null : ev.id); cs.setEditLocationId(null); cs.setEditMilestonesId(null) }}
                          style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 20,
                            border: `1px solid ${cs.editTeamId === ev.id ? C.blue : C.border}`,
                            background: cs.editTeamId === ev.id ? C.blueBg : 'transparent',
                            color: cs.editTeamId === ev.id ? C.blue : (ev.team_members?.length ? C.muted : C.faint),
                            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
                          }}
                        >
                          {ev.team_members?.length ? `👤 ${ev.team_members.length}` : '+ Team'}
                        </button>
                      </div>
                    </td>
                    <td style={{ ...td, maxWidth: 100 }}>
                      {ev.event_type === 'intensive' && (
                        <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', minHeight: 36 }}>
                          <button
                            onClick={() => { cs.setEditMilestonesId(cs.editMilestonesId === ev.id ? null : ev.id); cs.setEditTeamId(null); cs.setEditLocationId(null) }}
                            style={{
                              fontSize: 11, padding: '3px 9px', borderRadius: 20,
                              border: `1px solid ${cs.editMilestonesId === ev.id ? '#d97706' : C.border}`,
                              background: cs.editMilestonesId === ev.id ? '#fff7ed' : 'transparent',
                              color: cs.editMilestonesId === ev.id ? '#92400e' : ((ev as unknown as { intensive_milestones?: IntensiveMilestone[] | null }).intensive_milestones?.length ? '#d97706' : C.faint),
                              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
                            }}
                          >
                            {(ev as unknown as { intensive_milestones?: IntensiveMilestone[] | null }).intensive_milestones?.length
                              ? `📅 ${(ev as unknown as { intensive_milestones?: IntensiveMilestone[] | null }).intensive_milestones!.length}`
                              : '+ Dates'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Team picker expansion row */}
                  {cs.editTeamId === ev.id && (
                    <tr>
                      <td colSpan={18} style={{ padding: '14px 18px 16px', borderBottom: `1px solid ${C.border}`, background: '#f0f8ff' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                          Team Members — <span style={{ color: C.text, fontWeight: 600 }}>{ev.title}</span>
                        </div>
                        <TeamMemberPicker
                          value={ev.team_members ?? []}
                          onChange={v => cs.saveField(ev.id, 'team_members', v.length > 0 ? v : null)}
                          teams={config.teams ?? []}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Location picker expansion row */}
                  {cs.editLocationId === ev.id && (() => {
                    const currentLocs = ev.location ? ev.location.split(',').map(s => s.trim()).filter(Boolean) : []
                    const allLocs     = config.locations.length > 0 ? config.locations : LOCATIONS
                    function toggleLoc(loc: string) {
                      const next = currentLocs.includes(loc)
                        ? currentLocs.filter(l => l !== loc)
                        : [...currentLocs, loc]
                      cs.saveField(ev.id, 'location', next.length > 0 ? next.join(', ') : null)
                    }
                    return (
                      <tr>
                        <td colSpan={18} style={{ padding: '14px 18px 16px', borderBottom: `1px solid ${C.border}`, background: '#f0f8ff' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                            Locations — <span style={{ color: C.text, fontWeight: 600 }}>{ev.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                            {allLocs.map(loc => {
                              const active = currentLocs.includes(loc)
                              return (
                                <button key={loc} onClick={() => toggleLoc(loc)}
                                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${active ? C.blue : C.border}`, background: active ? C.blueBg : C.surface, color: active ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {active ? '✓ ' : ''}{loc}
                                </button>
                              )
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              placeholder="Custom location…"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const v = (e.target as HTMLInputElement).value.trim()
                                  if (v) { toggleLoc(v); (e.target as HTMLInputElement).value = '' }
                                }
                              }}
                              style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', width: 200 }}
                            />
                            <span style={{ fontSize: 11, color: C.faint }}>Type custom + Enter to add</span>
                            {currentLocs.length > 0 && (
                              <button onClick={() => cs.saveField(ev.id, 'location', null)} style={{ marginLeft: 4, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.brand, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Clear all
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })()}

                  {/* Milestones expansion row */}
                  {cs.editMilestonesId === ev.id && (() => {
                    const evMilestones = (ev as unknown as { intensive_milestones?: IntensiveMilestone[] | null }).intensive_milestones ?? []
                    function getMilestoneValue(label: IntensiveMilestone['label']): string {
                      const found = evMilestones.find(m => m.label === label)
                      return found ? found.date.slice(0, 16) : ''
                    }
                    function saveMilestones(label: IntensiveMilestone['label'], value: string) {
                      const updated: IntensiveMilestone[] = (['Start', 'Short list', 'Final'] as IntensiveMilestone['label'][]).reduce<IntensiveMilestone[]>((acc, l) => {
                        const existing = evMilestones.find(m => m.label === l)
                        const val      = l === label ? value : (existing?.date.slice(0, 16) ?? '')
                        if (val) acc.push({ label: l, date: new Date(val).toISOString() })
                        return acc
                      }, [])
                      cs.saveField(ev.id, 'intensive_milestones', updated.length > 0 ? updated : null)
                    }
                    return (
                      <tr>
                        <td colSpan={18} style={{ padding: '14px 18px 16px', borderBottom: `1px solid ${C.border}`, background: '#fffbeb' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                            Key Dates — <span style={{ color: C.text, fontWeight: 600 }}>{ev.title}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, maxWidth: 420 }}>
                            {([
                              { key: 'Start', label: 'Start' }, { key: 'Short list', label: 'Short list' }, { key: 'Final', label: 'Final' },
                            ] as { key: IntensiveMilestone['label']; label: string }[]).map(({ key, label }) => (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e', minWidth: 72, flexShrink: 0 }}>{label}</span>
                                <input
                                  type="datetime-local"
                                  defaultValue={getMilestoneValue(key)}
                                  onBlur={e => saveMilestones(key, e.target.value)}
                                  style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', flex: 1 }}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })()}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={18} style={{ textAlign: 'center', padding: '60px 24px', color: C.muted, fontSize: 14 }}>
                  No events match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
