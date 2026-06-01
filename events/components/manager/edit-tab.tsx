'use client'
import React, { useState } from 'react'
import type { EventConfig, RecurrenceEditMode } from '../../types'
import { C } from './shared'
import { RichEvent } from './stats-tab'
import { EditTable } from './edit-table'
import { RecurrenceModal } from './recurrence-modal'

interface PendingSave {
  id:    string
  field: string
  value: unknown
}

interface PendingDelete {
  id: string
}

export function EditTab({ events, config, onEventUpdated }: {
  events:         RichEvent[]
  config:         EventConfig
  onEventUpdated: (id: string, patch: Partial<RichEvent>) => void
}) {
  const [rows,              setRows]              = useState<RichEvent[]>(events)
  const [search,            setSearch]            = useState('')
  const [filterStatus,      setFilterStatus]      = useState<string>('all')
  const [dateFrom,          setDateFrom]          = useState('')
  const [dateTo,            setDateTo]            = useState('')
  const [editingCell,       setEditingCell]       = useState<{ id: string; field: string } | null>(null)
  const [tempValue,         setTempValue]         = useState('')
  const [savingId,          setSavingId]          = useState<string | null>(null)
  const [editTeamId,        setEditTeamId]        = useState<string | null>(null)
  const [editLocationId,    setEditLocationId]    = useState<string | null>(null)
  const [editMilestonesId,  setEditMilestonesId]  = useState<string | null>(null)

  // Recurrence modal state
  const [recEditModal,   setRecEditModal]   = useState<{ pending: PendingSave } | null>(null)
  const [recDeleteModal, setRecDeleteModal] = useState<{ pending: PendingDelete } | null>(null)
  const [recEditMode,    setRecEditMode]    = useState<RecurrenceEditMode>('this')
  const [recDeleteMode,  setRecDeleteMode]  = useState<RecurrenceEditMode>('this')

  // Sync when parent adds/removes events
  React.useEffect(() => { setRows(events) }, [events])

  const filtered = rows
    .filter(e => e.status !== 'deleted')
    .filter(e => filterStatus === 'all' || e.status === filterStatus)
    .filter(e => !dateFrom || e.start_at.slice(0, 10) >= dateFrom)
    .filter(e => !dateTo   || e.start_at.slice(0, 10) <= dateTo)
    .filter(e => !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.domain   ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.location ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at))

  function isRecurring(id: string): boolean {
    const ev = rows.find(r => r.id === id)
    if (!ev) return false
    const casted = ev as unknown as { recurrence_id?: string | null; recurrence_rule?: unknown }
    return !!(casted.recurrence_id || casted.recurrence_rule)
  }

  async function commitSaveField(id: string, field: string, value: unknown, editMode?: RecurrenceEditMode) {
    const patch = { [field]: value } as Partial<RichEvent>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    onEventUpdated(id, patch)
    setSavingId(id)
    try {
      const url = editMode ? `/api/events/${id}?edit_mode=${editMode}` : `/api/events/${id}`
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } finally { setSavingId(null) }
  }

  function saveField(id: string, field: string, value: unknown) {
    if (isRecurring(id)) {
      setRecEditMode('this')
      setRecEditModal({ pending: { id, field, value } })
    } else {
      void commitSaveField(id, field, value)
    }
  }

  function startEdit(id: string, field: string, val: string) {
    setEditingCell({ id, field })
    setTempValue(val)
  }

  function commitEdit() {
    if (!editingCell) return
    const { id, field } = editingCell
    setEditingCell(null)
    saveField(id, field, tempValue.trim() || null)
  }

  // Cell state bundle passed down to EditTable
  const cs = {
    editingCell, tempValue, editTeamId, editLocationId, editMilestonesId,
    setEditingCell, setTempValue, startEdit, commitEdit, saveField,
    setEditTeamId, setEditLocationId, setEditMilestonesId,
  }

  return (
    <div>
      {/* Recurrence edit modal */}
      {recEditModal && (
        <RecurrenceModal
          title="Edit recurring event"
          mode={recEditMode}
          setMode={setRecEditMode}
          onCancel={() => { setRecEditModal(null); setEditingCell(null) }}
          onConfirm={() => {
            const { id, field, value } = recEditModal.pending
            setRecEditModal(null)
            void commitSaveField(id, field, value, recEditMode)
          }}
        />
      )}

      {/* Recurrence delete modal */}
      {recDeleteModal && (
        <RecurrenceModal
          title="Delete recurring event"
          mode={recDeleteMode}
          setMode={setRecDeleteMode}
          onCancel={() => setRecDeleteModal(null)}
          onConfirm={() => {
            const { id } = recDeleteModal.pending
            setRecDeleteModal(null)
            void (async () => {
              const url = `/api/events/${id}?edit_mode=${recDeleteMode}`
              setSavingId(id)
              try {
                await fetch(url, { method: 'DELETE' })
                setRows(prev => prev.filter(r => r.id !== id))
              } finally { setSavingId(null) }
            })()
          }}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' as const }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events…"
          style={{ padding: '7px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', width: 220 }}
        />
        {(['all', 'draft', 'published'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${filterStatus === s ? C.brand : C.border}`, background: filterStatus === s ? C.brandBg : C.surface, color: filterStatus === s ? C.brand : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            {s === 'all' ? 'All' : s === 'draft' ? 'Drafts' : 'Published'}
          </button>
        ))}
        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', cursor: 'pointer' }} />
          <span style={{ fontSize: 10, color: C.muted }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', color: C.text, background: C.surface, outline: 'none', cursor: 'pointer' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.brand, cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear
            </button>
          )}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted }}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''} {savingId ? '· saving…' : ''}
        </span>
      </div>

      {/* Hint */}
      <div style={{ marginBottom: 12, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>&#9998;</span>
        Click any cell to edit inline. Selects save immediately; text fields save on Enter or focus-out.
      </div>

      <EditTable filtered={filtered} config={config} savingId={savingId} cs={cs} />
    </div>
  )
}
