'use client'
import React, { useState } from 'react'
import type { Organization } from '../../types'
import { C, ExistingEvent, formatShort, inp } from './shared'
import { OrgChip } from './ui-atoms'

interface DraftEvent {
  id: string; title: string; start_at: string; end_at: string
  organization: string | null; domain: string | null; publish_at: string | null
  description: string | null
}

export function DraftsTab({ initialDrafts }: { initialDrafts: ExistingEvent[] }) {
  const [drafts,    setDrafts]    = useState<DraftEvent[]>(initialDrafts.filter(e => e.status === 'draft') as DraftEvent[])
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [scheduleId,setScheduleId]= useState<string | null>(null)
  const [schedAt,   setSchedAt]   = useState('')
  const [publishing,setPublishing]= useState(false)
  const [msg,       setMsg]       = useState<string | null>(null)

  async function publish(ids: string[], publishAt?: string) {
    setPublishing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/events/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, publish_at: publishAt }),
      })
      const json = await res.json()
      if (!res.ok) { setMsg(`Помилка: ${json.error}`); return }

      if (publishAt) {
        setDrafts(prev => prev.map(d => ids.includes(d.id) ? { ...d, publish_at: publishAt } : d))
        setMsg(`Заплановано ${json.scheduled} подій на ${new Date(publishAt).toLocaleString('uk-UA')}`)
      } else {
        setDrafts(prev => prev.filter(d => !ids.includes(d.id)))
        setMsg(`Опубліковано ${json.published} подій`)
      }
      setSelected(new Set())
      setScheduleId(null)
    } finally { setPublishing(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const th: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: `2px solid ${C.border}`, background: C.bg }
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border2}`, verticalAlign: 'middle' }

  if (!drafts.length) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Немає чернеток</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Усі події опубліковані або ще не завантажені</div>
      </div>
    )
  }

  return (
    <div>
      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: C.greenBg, border: `1px solid ${C.green}33`, fontSize: 13, color: C.green, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, color: C.muted }}>{drafts.length} чернеток · {selected.size} вибрано</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => publish([...selected])}
            disabled={!selected.size || publishing}
            style={{ fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, border: 'none', background: selected.size ? C.green : C.faint, color: '#fff', cursor: selected.size && !publishing ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {publishing ? 'Публікація…' : `Опублікувати ${selected.size || ''}`}
          </button>
          <button
            onClick={() => { setSelected(new Set(drafts.map(d => d.id))) }}
            style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Вибрати всі
          </button>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 40 }} />
              <th style={th}>Подія</th>
              <th style={th}>Організація</th>
              <th style={th}>Дати</th>
              <th style={th}>Опис</th>
              <th style={th}>Розклад</th>
              <th style={th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map(ev => (
              <tr key={ev.id} style={{ background: selected.has(ev.id) ? C.blueBg : C.surface }}>
                <td style={{ ...td, textAlign: 'center' }}>
                  <input type="checkbox" checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {ev.domain ?? ''}{ev.domain && ev.organization ? ' · ' : ''}{ev.organization?.toUpperCase() ?? ''}
                  </div>
                </td>
                <td style={td}><OrgChip org={ev.organization as Organization | null} /></td>
                <td style={{ ...td, fontSize: 12, color: C.muted, maxWidth: 220 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description ?? '—'}</div>
                </td>
                <td style={{ ...td, fontSize: 12, color: C.muted }}>
                  <div>{formatShort(ev.start_at)}</div>
                  {ev.start_at !== ev.end_at && <div>→ {formatShort(ev.end_at)}</div>}
                </td>
                <td style={td}>
                  {ev.publish_at
                    ? <span style={{ fontSize: 11, color: C.yellow, fontWeight: 600 }}>🕐 {new Date(ev.publish_at).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    : <span style={{ fontSize: 11, color: C.faint }}>Не задано</span>
                  }
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => publish([ev.id])}
                      disabled={publishing}
                      style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      Опублікувати
                    </button>
                    <button
                      onClick={() => { setScheduleId(ev.id); setSchedAt('') }}
                      style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      📅 Розклад
                    </button>
                  </div>

                  {/* Inline schedule picker */}
                  {scheduleId === ev.id && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="datetime-local"
                        value={schedAt}
                        onChange={e => setSchedAt(e.target.value)}
                        style={inp({ flex: 1, fontSize: 12, padding: '5px 8px' })}
                      />
                      <button
                        onClick={() => publish([ev.id], new Date(schedAt).toISOString())}
                        disabled={!schedAt || publishing}
                        style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 6, border: 'none', background: C.yellow, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Зберегти
                      </button>
                      <button
                        onClick={() => setScheduleId(null)}
                        style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
