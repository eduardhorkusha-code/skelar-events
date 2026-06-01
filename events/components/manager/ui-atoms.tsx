'use client'
import React, { useState } from 'react'
import type { Organization, TeamConfig } from '../../types'
import { parseTeamMember, ORG_META } from '../../types'
import { C, StagedEvent, inp } from './shared'

export function Badge({ status }: { status: StagedEvent['dupStatus'] }) {
  const map = {
    clean:    { label: 'New',             bg: C.greenBg,  color: C.green  },
    possible: { label: 'Possible dup',    bg: C.yellowBg, color: C.yellow },
    exact:    { label: 'Duplicate',       bg: C.brandBg,  color: C.brand  },
  }
  const m = map[status]
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: m.bg, color: m.color }}>{m.label}</span>
}

export function OrgChip({ org }: { org: Organization | null }) {
  if (!org) return <span style={{ color: C.faint, fontSize: 11 }}>—</span>
  const m = ORG_META[org]
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: m.bg, color: m.color }}>{m.label}</span>
}

export function TeamMemberPicker({ value, onChange, teams }: {
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
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Full name…"
          style={inp({ flex: 1 } as React.CSSProperties)} />
        {teams.length > 0 && (
          <select value={team} onChange={e => setTeam(e.target.value)}
            style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', cursor: 'pointer' }}>
            <option value="">No team</option>
            {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        )}
        <button onClick={add} disabled={!name.trim()}
          style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: 'none', background: name.trim() ? C.text : C.faint, color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
          + Add
        </button>
      </div>
    </div>
  )
}
