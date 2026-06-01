'use client'
import React from 'react'
import type { RecurrenceEditMode } from '../../types'
import { C } from './shared'

interface Props {
  title:     string
  mode:      RecurrenceEditMode
  setMode:   (m: RecurrenceEditMode) => void
  onCancel:  () => void
  onConfirm: () => void
}

export function RecurrenceModal({ title, mode, setMode, onCancel, onConfirm }: Props) {
  const options: { value: RecurrenceEditMode; label: string }[] = [
    { value: 'this',               label: 'Only this event' },
    { value: 'this_and_following', label: 'This and following events' },
    { value: 'all',                label: 'All events in the series' },
  ]
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        style={{ background: C.surface, borderRadius: 12, padding: '24px 28px', width: 380, boxShadow: '0 16px 48px rgba(0,0,0,0.18)', border: `1px solid ${C.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 20 }}>
          {options.map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: C.text }}>
              <input type="radio" name="recMode" value={opt.value} checked={mode === opt.value} onChange={() => setMode(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 700, border: 'none', background: C.brand, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
