'use client'
import React, { useState } from 'react'
import type { Organization } from '../../types'
import { C, ExistingEvent, formatShort } from './shared'
import { OrgChip } from './ui-atoms'

export function DeletedTab({ initialDeleted, onRestore }: {
  initialDeleted: ExistingEvent[]
  onRestore: (id: string) => void
}) {
  const [deleted,   setDeleted]   = useState<ExistingEvent[]>(initialDeleted.filter(e => e.status === 'deleted'))
  const [restoring, setRestoring] = useState<string | null>(null)
  const [msg,       setMsg]       = useState<string | null>(null)

  async function restore(id: string) {
    setRestoring(id)
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      if (!res.ok) { setMsg('Restore failed'); return }
      setDeleted(prev => prev.filter(e => e.id !== id))
      onRestore(id)
      setMsg('Event restored as draft')
      setTimeout(() => setMsg(null), 3000)
    } finally { setRestoring(null) }
  }

  const th: React.CSSProperties = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', borderBottom: `2px solid ${C.border}`, background: C.bg }
  const td: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border2}`, verticalAlign: 'middle' }

  if (!deleted.length) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>No deleted events</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Events deleted from the calendar appear here and can be restored</div>
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
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Event</th>
              <th style={th}>Organization</th>
              <th style={th}>Dates</th>
              <th style={th}>Domain</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deleted.map(ev => (
              <tr key={ev.id} style={{ background: '#fff8f8', opacity: 0.85 }}>
                <td style={{ ...td, fontWeight: 600, color: C.muted, textDecoration: 'line-through' }}>{ev.title}</td>
                <td style={td}><OrgChip org={ev.organization as Organization | null} /></td>
                <td style={{ ...td, fontSize: 12, color: C.muted }}>
                  <div>{formatShort(ev.start_at)}</div>
                  {ev.start_at !== ev.end_at && <div>→ {formatShort(ev.end_at)}</div>}
                </td>
                <td style={{ ...td, fontSize: 12, color: C.muted }}>{ev.domain ?? '—'}</td>
                <td style={td}>
                  <button
                    onClick={() => restore(ev.id)}
                    disabled={restoring === ev.id}
                    style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {restoring === ev.id ? 'Restoring…' : '↩ Restore'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
