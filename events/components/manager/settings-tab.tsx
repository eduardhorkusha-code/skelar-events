'use client'
import React, { useState } from 'react'
import type { EventConfig, EventTypeConfig, TeamConfig } from '../../types'
import { C, inp } from './shared'

const PRESET_COLORS = [
  { color: '#DC2626', bg: '#fef2f2', name: 'Red'    },
  { color: '#d97706', bg: '#fffbeb', name: 'Amber'  },
  { color: '#16a34a', bg: '#f0fdf4', name: 'Green'  },
  { color: '#2563EB', bg: '#eff6ff', name: 'Blue'   },
  { color: '#7C3AED', bg: '#f5f3ff', name: 'Purple' },
  { color: '#0891b2', bg: '#ecfeff', name: 'Cyan'   },
  { color: '#6b7280', bg: '#f9fafb', name: 'Gray'   },
  { color: '#be185d', bg: '#fdf2f8', name: 'Pink'   },
]

function TagInput({ values, onChange, placeholder }: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  function addValue() {
    const v = draft.trim()
    if (!v || values.includes(v)) { setDraft(''); return }
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', background: C.surface, display: 'flex', flexWrap: 'wrap' as const, gap: 6, alignItems: 'center', minHeight: 46, cursor: 'text' }}>
      {values.map(v => (
        <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px 3px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 12, color: C.text, whiteSpace: 'nowrap' as const }}>
          {v}
          <button onClick={() => onChange(values.filter(x => x !== v))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: C.muted, padding: '0 0 0 2px', lineHeight: 1 }}>×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addValue() }
          if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
        }}
        onBlur={addValue}
        placeholder={values.length === 0 ? (placeholder ?? 'Type and press Enter…') : '+ Add…'}
        style={{ border: 'none', outline: 'none', fontSize: 12, color: C.text, background: 'transparent', fontFamily: 'inherit', minWidth: 100, flex: 1, padding: '2px 0' }}
      />
    </div>
  )
}

function ColorPickerButton({ selected, onChange }: {
  selected: string
  onChange: (color: string, bg: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change color"
        style={{
          width: 26, height: 26, borderRadius: '50%', background: selected,
          padding: 0, cursor: 'pointer', flexShrink: 0,
          border: '2px solid #fff',
          boxShadow: `0 0 0 2px ${selected}55`,
          position: 'relative' as const,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.85)', fontWeight: 900, lineHeight: 1, marginTop: 1 }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{
            position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '10px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 24px)', gap: 6,
            width: 'auto',
          }}>
            {PRESET_COLORS.map(pc => (
              <button key={pc.color} title={pc.name}
                onClick={() => { onChange(pc.color, pc.bg); setOpen(false) }}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: pc.color,
                  padding: 0, cursor: 'pointer',
                  border: selected === pc.color ? `3px solid ${C.text}` : '2px solid transparent',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function SettingsTab({ config, onSave }: {
  config: EventConfig
  onSave: (updated: EventConfig) => void
}) {
  const [domains,      setDomains]      = useState<string[]>(config.domains)
  const [locations,    setLocations]    = useState<string[]>(config.locations)
  const [types,        setTypes]        = useState<EventTypeConfig[]>(config.event_types)
  const [teams,        setTeams]        = useState<TeamConfig[]>(config.teams ?? [])
  const [contactEmail, setContactEmail] = useState(config.contact_email ?? '')
  const [newTypeKey,   setNewTypeKey]   = useState('')
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newTypeColor, setNewTypeColor] = useState(PRESET_COLORS[0].color)
  const [newTypeBg,    setNewTypeBg]    = useState(PRESET_COLORS[0].bg)
  const [newTeamName,  setNewTeamName]  = useState('')
  const [newTeamColor, setNewTeamColor] = useState(PRESET_COLORS[4].color)
  const [newTeamBg,    setNewTeamBg]    = useState(PRESET_COLORS[4].bg)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState<string | null>(null)
  const [msgOk,        setMsgOk]        = useState(true)

  async function handleSave() {
    setSaving(true); setMsg(null)
    const updated: EventConfig = { domains, locations, event_types: types, teams, contact_email: contactEmail || undefined }
    // The config API stores each key as an array; contact_email is stored as [email]
    const payload: Record<string, unknown[]> = {
      domains,
      locations,
      event_types: types,
      teams,
      ...(contactEmail ? { contact_email: [contactEmail] } : {}),
    }
    try {
      const res = await fetch('/api/events/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const j = await res.json(); setMsg(j.error ?? 'Save failed'); setMsgOk(false); return }
      onSave(updated)
      setMsg('Settings saved successfully'); setMsgOk(true)
      setTimeout(() => setMsg(null), 4000)
    } finally { setSaving(false) }
  }

  function addType() {
    const key = newTypeKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!key || !newTypeLabel.trim()) return
    if (types.some(t => t.key === key)) { setMsg('Type key already exists'); setMsgOk(false); return }
    setTypes(prev => [...prev, { key, label: newTypeLabel.trim(), color: newTypeColor, bg: newTypeBg }])
    setNewTypeKey(''); setNewTypeLabel('')
  }
  function removeType(key: string) { setTypes(prev => prev.filter(t => t.key !== key)) }
  function updateType(key: string, field: keyof EventTypeConfig, value: string) {
    setTypes(prev => prev.map(t => t.key === key ? { ...t, [field]: value } : t))
  }
  function addTeam() {
    const name = newTeamName.trim()
    if (!name) return
    if (teams.some(t => t.name === name)) { setMsg('Team name already exists'); setMsgOk(false); return }
    setTeams(prev => [...prev, { name, color: newTeamColor, bg: newTeamBg }])
    setNewTeamName('')
  }
  function removeTeam(name: string) { setTeams(prev => prev.filter(t => t.name !== name)) }
  function updateTeam(name: string, field: keyof TeamConfig, value: string) {
    setTeams(prev => prev.map(t => t.name === name ? { ...t, [field]: value } : t))
  }

  const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }
  const cardHead: React.CSSProperties = { padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }
  const cardBody: React.CSSProperties = { padding: '20px 22px' }
  const iconBox = (bg: string, border: string, emoji: string) => (
    <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{emoji}</div>
  )
  const addZone = (accentColor: string, title: string, children: React.ReactNode) => (
    <div style={{ padding: '14px 16px', background: `${accentColor}08`, borderRadius: 10, border: `1.5px dashed ${accentColor}50` }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: accentColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
  const fldLbl: React.CSSProperties = { fontSize: 10, color: C.muted, marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }

  return (
    <div style={{ maxWidth: 920 }}>
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, background: msgOk ? C.greenBg : C.brandBg, border: `1px solid ${msgOk ? C.green : C.brand}44`, color: msgOk ? C.green : C.brand, fontSize: 13, fontWeight: 600 }}>
          <span style={{ fontSize: 16 }}>{msgOk ? '✓' : '⚠'}</span>{msg}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit', opacity: 0.6 }}>×</button>
        </div>
      )}

      {/* Row 1: Domains + Locations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={card}>
          <div style={cardHead}>
            {iconBox(C.blueBg, `${C.blue}33`, '🗂')}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Domains</div>
              <div style={{ fontSize: 11, color: C.muted }}>Filters &amp; event creation form</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>{domains.length}</span>
          </div>
          <div style={cardBody}>
            <TagInput values={domains} onChange={setDomains} placeholder="academy, analytics, tech…" />
            <div style={{ marginTop: 8, fontSize: 11, color: C.faint }}>Enter value and press Enter or comma to add · Backspace to remove last</div>
          </div>
        </div>

        <div style={card}>
          <div style={cardHead}>
            {iconBox('#ecfeff', '#0891b233', '📍')}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Locations</div>
              <div style={{ fontSize: 11, color: C.muted }}>Available in event creation &amp; edit forms</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>{locations.length}</span>
          </div>
          <div style={cardBody}>
            <TagInput values={locations} onChange={setLocations} placeholder="Online, Kyiv, Warsaw…" />
            <div style={{ marginTop: 8, fontSize: 11, color: C.faint }}>Enter value and press Enter or comma to add · Backspace to remove last</div>
          </div>
        </div>
      </div>

      {/* Event Types */}
      <div style={card}>
        <div style={cardHead}>
          {iconBox(C.yellowBg, `${C.yellow}33`, '🏷')}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Event Types</div>
            <div style={{ fontSize: 11, color: C.muted }}>Labels &amp; colors used on event cards and filters</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>{types.length} types</span>
        </div>
        <div style={cardBody}>
          {/* Column headers */}
          {types.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 160px 36px 32px', gap: 10, padding: '0 14px 6px', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Preview</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Key</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Display label</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Color</span>
              <span />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 16 }}>
            {types.map(t => (
              <div key={t.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 160px 36px 32px', gap: 10, padding: '8px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, alignItems: 'center' }}>
                {/* Preview badge */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: t.bg, color: t.color, border: `1px solid ${t.color}33`, whiteSpace: 'nowrap' as const, textAlign: 'center' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
                {/* Key */}
                <code style={{ fontSize: 10, color: C.faint, background: C.border2, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{t.key}</code>
                {/* Label input */}
                <input value={t.label} onChange={e => updateType(t.key, 'label', e.target.value)}
                  style={inp({ padding: '5px 8px', fontSize: 12 })} placeholder="Label…" />
                {/* Color */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ColorPickerButton selected={t.color} onChange={(c, bg) => { updateType(t.key, 'color', c); updateType(t.key, 'bg', bg) }} />
                </div>
                {/* Delete */}
                <button onClick={() => removeType(t.key)} style={{ width: 28, height: 28, borderRadius: 6, background: C.brandBg, border: 'none', cursor: 'pointer', color: C.brand, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
            {types.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: C.faint, fontSize: 12 }}>No event types defined yet</div>}
          </div>
          {addZone(C.blue, 'Add new type', (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
              <div>
                <span style={fldLbl}>DB key</span>
                <input value={newTypeKey} onChange={e => setNewTypeKey(e.target.value)} placeholder="workshop"
                  style={inp({ width: 110, padding: '6px 9px', fontSize: 12 })} />
              </div>
              <div>
                <span style={fldLbl}>Display label</span>
                <input value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)} placeholder="Workshop"
                  onKeyDown={e => { if (e.key === 'Enter') addType() }}
                  style={inp({ width: 140, padding: '6px 9px', fontSize: 12 })} />
              </div>
              <div>
                <span style={fldLbl}>Color</span>
                <div style={{ paddingTop: 5 }}><ColorPickerButton selected={newTypeColor} onChange={(c, bg) => { setNewTypeColor(c); setNewTypeBg(bg) }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 1 }}>
                {newTypeKey && newTypeLabel && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: newTypeBg, color: newTypeColor, border: `1px solid ${newTypeColor}40`, whiteSpace: 'nowrap' as const }}>{newTypeLabel}</span>
                )}
                <button onClick={addType} disabled={!newTypeKey || !newTypeLabel}
                  style={{ fontSize: 12, fontWeight: 700, padding: '7px 18px', borderRadius: 7, border: 'none', background: newTypeKey && newTypeLabel ? C.blue : C.faint, color: '#fff', cursor: newTypeKey && newTypeLabel ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                  + Add type
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div style={card}>
        <div style={cardHead}>
          {iconBox('#f5f3ff', '#7C3AED33', '👥')}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Teams</div>
            <div style={{ fontSize: 11, color: C.muted }}>Groups for responsible persons — shown on event cards with color coding</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>{teams.length} teams</span>
        </div>
        <div style={cardBody}>
          {teams.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10, marginBottom: 16 }}>
              {teams.map(t => (
                <div key={t.name} style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <div style={{ height: 5, background: t.color }} />
                  <div style={{ padding: '12px 14px', background: C.surface }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: t.bg, border: `2px solid ${t.color}`, flexShrink: 0 }} />
                      <input value={t.name} onChange={e => updateTeam(t.name, 'name', e.target.value)}
                        style={inp({ flex: 1, padding: '5px 9px', fontSize: 13, fontWeight: 600 })} />
                      <button onClick={() => removeTeam(t.name)} style={{ width: 26, height: 26, borderRadius: 6, background: C.brandBg, border: 'none', cursor: 'pointer', color: C.brand, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                    </div>
                    <ColorPickerButton selected={t.color} onChange={(c, bg) => { updateTeam(t.name, 'color', c); updateTeam(t.name, 'bg', bg) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {teams.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: C.faint, fontSize: 12, marginBottom: 16, border: `1px dashed ${C.border}`, borderRadius: 10 }}>
              No teams yet. Create teams to group responsible persons by department or function.
            </div>
          )}
          {addZone('#7C3AED', 'Add new team', (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
              <div>
                <span style={fldLbl}>Team name</span>
                <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Marketing"
                  onKeyDown={e => { if (e.key === 'Enter') addTeam() }}
                  style={inp({ width: 170, padding: '6px 9px', fontSize: 12 })} />
              </div>
              <div>
                <span style={fldLbl}>Color</span>
                <div style={{ paddingTop: 5 }}><ColorPickerButton selected={newTeamColor} onChange={(c, bg) => { setNewTeamColor(c); setNewTeamBg(bg) }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 1 }}>
                {newTeamName && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: newTeamBg, color: newTeamColor, border: `1px solid ${newTeamColor}40`, whiteSpace: 'nowrap' as const }}>{newTeamName}</span>
                )}
                <button onClick={addTeam} disabled={!newTeamName}
                  style={{ fontSize: 12, fontWeight: 700, padding: '7px 18px', borderRadius: 7, border: 'none', background: newTeamName ? '#7C3AED' : C.faint, color: '#fff', cursor: newTeamName ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                  + Add team
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact email */}
      <div style={card}>
        <div style={cardHead}>
          {iconBox('#f0fdf4', '#16a34a33', '✉️')}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Platform contact</div>
            <div style={{ fontSize: 11, color: C.muted }}>Shown to all users below the page title — for questions about this platform</div>
          </div>
        </div>
        <div style={cardBody}>
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="events@skelar.tech"
            style={inp({ width: '100%', padding: '9px 12px', fontSize: 13 })}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: C.faint }}>Leave empty to hide the contact line</div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, paddingTop: 4 }}>
        <span style={{ fontSize: 12, color: C.faint }}>Changes apply globally and save to the database</span>
        <button onClick={handleSave} disabled={saving}
          style={{ fontSize: 13, fontWeight: 700, padding: '10px 28px', borderRadius: 9, border: 'none', background: saving ? C.faint : C.brand, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minWidth: 160 }}>
          {saving ? 'Saving…' : '💾  Save settings'}
        </button>
      </div>
    </div>
  )
}
