'use client'
import React from 'react'
import type { Organization } from '../../types'
import { EVENT_TYPE_META } from '../../types'
import { C, StagedEvent, formatShort } from './shared'
import { Badge, OrgChip } from './ui-atoms'

export function ReviewTab({ staged, onChange, onSaveDrafts, saving }: {
  staged: StagedEvent[]
  onChange: (events: StagedEvent[]) => void
  onSaveDrafts: () => void
  saving: boolean
}) {
  const selected = staged.filter(e => e.selected)
  const clean    = staged.filter(e => e.dupStatus === 'clean').length
  const possible = staged.filter(e => e.dupStatus === 'possible').length
  const exact    = staged.filter(e => e.dupStatus === 'exact').length

  function toggleAll() {
    const allSelected = staged.every(e => e.selected)
    onChange(staged.map(e => ({ ...e, selected: !allSelected })))
  }

  function toggle(key: string) {
    onChange(staged.map(e => e._key === key ? { ...e, selected: !e.selected } : e))
  }

  if (!staged.length) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Нема даних для перегляду</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Спочатку завантаж події на вкладці Import</div>
      </div>
    )
  }

  const th: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap', background: C.bg }
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border2}`, verticalAlign: 'middle' }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: `Нові: ${clean}`,        color: C.green,  bg: C.greenBg  },
          { label: `Можл. дублікат: ${possible}`, color: C.yellow, bg: C.yellowBg },
          { label: `Дублікат: ${exact}`,    color: C.brand,  bg: C.brandBg  },
          { label: `Вибрано: ${selected.length} / ${staged.length}`, color: C.blue, bg: C.blueBg },
        ].map(s => (
          <span key={s.label} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: s.bg, color: s.color }}>
            {s.label}
          </span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={toggleAll}
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {staged.every(e => e.selected) ? 'Зняти всі' : 'Вибрати всі'}
          </button>
          <button
            onClick={onSaveDrafts}
            disabled={!selected.length || saving}
            style={{ fontSize: 13, fontWeight: 700, padding: '6px 18px', borderRadius: 7, border: 'none', background: selected.length ? C.brand : C.faint, color: '#fff', cursor: selected.length && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {saving ? 'Збереження…' : `Зберегти ${selected.length} як чернетку`}
          </button>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 40 }}>
                <input type="checkbox" checked={staged.every(e => e.selected)} onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              <th style={th}>Подія</th>
              <th style={th}>Тип</th>
              <th style={th}>Організація</th>
              <th style={th}>Дати</th>
              <th style={th}>Локація</th>
              <th style={th}>Опис</th>
              <th style={th}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {staged.map(ev => {
              const rowBg = ev.dupStatus === 'exact' ? '#fff8f8'
                : ev.dupStatus === 'possible' ? '#fffdf0'
                : C.surface
              const tm = EVENT_TYPE_META[ev.event_type] ?? EVENT_TYPE_META.event
              return (
                <tr
                  key={ev._key}
                  style={{ background: rowBg, cursor: 'pointer' }}
                  onClick={() => toggle(ev._key)}
                >
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input type="checkbox" checked={ev.selected} onChange={() => toggle(ev._key)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
                    {ev.dupStatus !== 'clean' && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>схожий на: «{ev.dupTitle}»</div>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: tm.bg, color: tm.color, fontWeight: 600 }}>{tm.label}</span>
                  </td>
                  <td style={td}><OrgChip org={ev.organization} /></td>
                  <td style={{ ...td, fontSize: 12, color: C.muted }}>
                    <div>{formatShort(ev.start_at)}</div>
                    {ev.start_at !== ev.end_at && <div>→ {formatShort(ev.end_at)}</div>}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: C.muted }}>{ev.location ?? '—'}</td>
                  <td style={{ ...td, fontSize: 12, color: C.muted, maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description ?? '—'}</div>
                  </td>
                  <td style={td}><Badge status={ev.dupStatus} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
