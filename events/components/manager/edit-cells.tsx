'use client'
import React from 'react'
import { C } from './shared'

// Shared cell state interface — used by EditTable and all cell components
export interface CellState {
  editingCell:         { id: string; field: string } | null
  tempValue:           string
  editTeamId:          string | null
  editLocationId:      string | null
  editMilestonesId:    string | null
  setEditingCell:      (v: { id: string; field: string } | null) => void
  setTempValue:        (v: string) => void
  startEdit:           (id: string, field: string, val: string) => void
  commitEdit:          () => void
  saveField:           (id: string, field: string, value: unknown) => void
  setEditTeamId:       (v: string | null) => void
  setEditLocationId:   (v: string | null) => void
  setEditMilestonesId: (v: string | null) => void
}

export function CellText(
  { id, field, value, placeholder, style, cs }:
  { id: string; field: string; value: string | null; placeholder?: string; style?: React.CSSProperties; cs: CellState }
) {
  const isEditing = cs.editingCell?.id === id && cs.editingCell?.field === field
  if (isEditing) {
    return (
      <input
        autoFocus
        value={cs.tempValue}
        onChange={e => cs.setTempValue(e.target.value)}
        onBlur={cs.commitEdit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); cs.commitEdit() }
          if (e.key === 'Escape') cs.setEditingCell(null)
        }}
        style={{ width: '100%', padding: '7px 10px', border: 'none', outline: `2px solid ${C.blue}`, outlineOffset: -2, fontSize: 13, fontFamily: 'inherit', color: C.text, background: '#EFF6FF', boxSizing: 'border-box', ...(style ?? {}) }}
      />
    )
  }
  return (
    <div
      onClick={() => cs.startEdit(id, field, value ?? '')}
      title="Click to edit"
      style={{ padding: '7px 10px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'text', fontSize: 13, color: value ? C.text : C.faint, lineHeight: 1.3, ...(style ?? {}) }}
    >
      {value || <span style={{ fontSize: 12, color: C.faint }}>{placeholder ?? '—'}</span>}
    </div>
  )
}

export function CellNumber(
  { id, field, value, placeholder = '∞', cs }:
  { id: string; field: string; value: number | null; placeholder?: string; cs: CellState }
) {
  const isEditing = cs.editingCell?.id === id && cs.editingCell?.field === field
  if (isEditing) {
    return (
      <input
        autoFocus
        type="number"
        value={cs.tempValue}
        onChange={e => cs.setTempValue(e.target.value)}
        onBlur={() => {
          cs.setEditingCell(null)
          cs.saveField(id, field, cs.tempValue.trim() === '' ? null : Number(cs.tempValue))
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') cs.setEditingCell(null)
        }}
        style={{ width: '100%', padding: '7px 10px', border: 'none', outline: `2px solid ${C.blue}`, outlineOffset: -2, fontSize: 13, fontFamily: 'inherit', background: '#EFF6FF', boxSizing: 'border-box' }}
      />
    )
  }
  return (
    <div
      onClick={() => cs.startEdit(id, field, value != null ? String(value) : '')}
      title="Click to edit"
      style={{ padding: '7px 10px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'text', fontSize: 13, color: value != null ? C.text : C.faint }}
    >
      {value != null ? value : <span style={{ fontSize: 12 }}>{placeholder}</span>}
    </div>
  )
}

export function CellSelect(
  { id, field, value, options, placeholder = '—', cs }:
  { id: string; field: string; value: string | null; options: { value: string; label: string; color?: string; bg?: string }[]; placeholder?: string; cs: CellState }
) {
  const curr = options.find(o => o.value === (value ?? ''))
  return (
    <div style={{ padding: '4px 6px', minHeight: 36, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative' as const }}>
        <select
          value={value ?? ''}
          onChange={e => cs.saveField(id, field, e.target.value || null)}
          style={{
            padding: '4px 24px 4px 9px',
            border: `1.5px solid ${curr?.color ?? C.border}`,
            borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: curr?.color ?? C.muted, background: curr?.bg ?? C.bg,
            cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
            appearance: 'none' as React.CSSProperties['appearance'],
          }}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 8, color: curr?.color ?? C.muted }}>▼</span>
      </div>
    </div>
  )
}

export function CellDate(
  { id, field, value, cs }:
  { id: string; field: string; value: string; cs: CellState }
) {
  const isEditing = cs.editingCell?.id === id && cs.editingCell?.field === field
  const dateOnly  = value ? value.slice(0, 10) : ''
  const timeOnly  = value && value.length > 10 ? value.slice(11, 16) : '10:00'
  if (isEditing) {
    return (
      <input
        autoFocus
        type="date"
        value={cs.tempValue}
        onChange={e => cs.setTempValue(e.target.value)}
        onBlur={() => {
          cs.setEditingCell(null)
          if (cs.tempValue) cs.saveField(id, field, `${cs.tempValue}T${timeOnly}:00Z`)
        }}
        onKeyDown={e => { if (e.key === 'Escape') cs.setEditingCell(null) }}
        style={{ width: '100%', padding: '7px 8px', border: 'none', outline: `2px solid ${C.blue}`, outlineOffset: -2, fontSize: 12, fontFamily: 'inherit', background: '#EFF6FF', boxSizing: 'border-box' }}
      />
    )
  }
  const label = dateOnly
    ? new Date(dateOnly + 'T12:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    : '—'
  return (
    <div
      onClick={() => cs.startEdit(id, field, dateOnly)}
      title="Click to edit date"
      style={{ padding: '7px 10px', minHeight: 36, display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 12, color: dateOnly ? C.muted : C.faint }}
    >
      {label}
    </div>
  )
}
