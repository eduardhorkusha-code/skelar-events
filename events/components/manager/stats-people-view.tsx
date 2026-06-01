'use client'
import React, { useState } from 'react'
import type { TeamConfig } from '../../types'
import { C, initials, avatarColor } from './shared'

interface PersonEntry {
  name:   string
  team:   string | null
  count:  number
  events: { title: string; start_at: string }[]
}

export function StatsPeopleView({
  persons, teams,
}: {
  persons: PersonEntry[]
  teams:   TeamConfig[]
}) {
  const [peopleSearch,   setPeopleSearch]   = useState('')
  const [teamFilter,     setTeamFilter]     = useState<string | null>(null)
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)

  const filteredPersons = persons
    .filter(p => !teamFilter || p.team === teamFilter)
    .filter(p => !peopleSearch || p.name.toLowerCase().includes(peopleSearch.toLowerCase()))

  const maxCount = persons[0]?.count ?? 1

  return (
    <>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', background: '#f5f3ff', border: '1px solid #7C3AED22', borderRadius: 12, minWidth: 130 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED', lineHeight: 1 }}>{persons.length}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Active people</div>
        </div>
        <div style={{ padding: '14px 20px', background: C.blueBg, border: `1px solid ${C.blue}22`, borderRadius: 12, minWidth: 130 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.blue, lineHeight: 1 }}>
            {persons.length > 0 ? (persons.reduce((s, p) => s + p.count, 0) / persons.length).toFixed(1) : '0'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Avg events / person</div>
        </div>
        {persons[0] && (
          <div style={{ padding: '14px 20px', background: '#fffbeb', border: '1px solid #ca8a0422', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(persons[0].name).bg, border: `2px solid ${avatarColor(persons[0].name).color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: avatarColor(persons[0].name).color, flexShrink: 0 }}>
              {initials(persons[0].name)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>Most active</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{persons[0].name}</div>
              <div style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600 }}>{persons[0].count} event{persons[0].count !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar: search + team filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' as const }}>
        <input
          value={peopleSearch}
          onChange={e => setPeopleSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ padding: '7px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', width: 220 }}
        />
        {teams.length > 0 && (
          <>
            <button onClick={() => setTeamFilter(null)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${teamFilter === null ? C.text : C.border}`, background: teamFilter === null ? C.text : C.surface, color: teamFilter === null ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              All teams
            </button>
            {teams.map(t => (
              <button key={t.name} onClick={() => setTeamFilter(teamFilter === t.name ? null : t.name)}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${teamFilter === t.name ? t.color : C.border}`, background: teamFilter === t.name ? t.bg : C.surface, color: teamFilter === t.name ? t.color : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t.name}
              </button>
            ))}
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted }}>
          {filteredPersons.length} of {persons.length} people
        </span>
      </div>

      {/* Leaderboard */}
      {!persons.length ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: C.muted, fontSize: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 600 }}>No team members assigned to events in this period</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Add responsible persons to events in the Edit tab</div>
        </div>
      ) : !filteredPersons.length ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: C.muted, fontSize: 13, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          No people match your search
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {filteredPersons.map(p => {
            const globalRank = persons.indexOf(p) + 1
            const medals     = ['🥇', '🥈', '🥉']
            const medal      = globalRank <= 3 ? medals[globalRank - 1] : null
            const ac         = avatarColor(p.name)
            const teamMeta   = teams.find(t => t.name === p.team)
            const barPct     = maxCount > 0 ? Math.round((p.count / maxCount) * 100) : 0
            const isExpanded = expandedPerson === p.name
            const rankColor  = globalRank === 1 ? '#ca8a04' : globalRank === 2 ? '#6b7280' : globalRank === 3 ? '#92400e' : C.muted
            return (
              <div key={p.name} style={{ background: C.surface, border: `1px solid ${isExpanded ? C.blue + '44' : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s', boxShadow: isExpanded ? `0 0 0 2px ${C.blue}18` : 'none' }}>
                <div
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => setExpandedPerson(isExpanded ? null : p.name)}
                >
                  {/* Rank */}
                  <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                    {medal
                      ? <span style={{ fontSize: 20, lineHeight: 1 }}>{medal}</span>
                      : <span style={{ fontSize: 13, fontWeight: 700, color: rankColor }}>{globalRank}</span>}
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: ac.bg, border: `2px solid ${ac.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: ac.color, flexShrink: 0, letterSpacing: '-0.5px' }}>
                    {initials(p.name)}
                  </div>

                  {/* Name + team */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ marginTop: 3 }}>
                      {p.team && teamMeta
                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: teamMeta.bg, color: teamMeta.color, border: `1px solid ${teamMeta.color}33` }}>{p.team}</span>
                        : <span style={{ fontSize: 11, color: C.faint }}>No team</span>}
                    </div>
                  </div>

                  {/* Event count + bar */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 120 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: globalRank === 1 ? '#ca8a04' : globalRank === 2 ? '#6b7280' : globalRank === 3 ? '#b45309' : C.blue, lineHeight: 1 }}>{p.count}</div>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 6 }}>event{p.count !== 1 ? 's' : ''}</div>
                    <div style={{ width: 100, height: 5, background: C.border, borderRadius: 3, overflow: 'hidden', marginLeft: 'auto' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', background: teamMeta?.color ?? C.blue, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Expand arrow */}
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: isExpanded ? C.blueBg : C.bg, border: `1px solid ${isExpanded ? C.blue + '44' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: isExpanded ? C.blue : C.muted, flexShrink: 0, transition: 'all 0.15s' }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded event list */}
                {isExpanded && (
                  <div style={{ padding: '12px 18px 16px 18px', borderTop: `1px solid ${C.border2}`, background: C.bg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>Events — {p.count} total</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                      {p.events.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap' as const }}>
                            {new Date(ev.start_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                          </span>
                          <span style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{ev.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
