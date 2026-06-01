'use client'
import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import type { EventConfig } from '../types'
import { LOCATIONS } from '../types'
import { C, ExistingEvent, StagedEvent, detectDuplicates } from './manager/shared'
import { ImportTab } from './manager/import-tab'
import { ReviewTab } from './manager/review-tab'
import { DraftsTab } from './manager/drafts-tab'
import { StatsTab, RichEvent } from './manager/stats-tab'
import { DeletedTab } from './manager/deleted-tab'
import { CreateEventForm } from './manager/create-event-form'
import { SettingsTab } from './manager/settings-tab'
import { EditTab } from './manager/edit-tab'
import { ManualTab } from './manager/manual-tab'

// Re-export for consumers that import from ManagerClient
export type { ExistingEvent, StagedEvent }

type ManagerTab = 'import' | 'review' | 'drafts' | 'edit' | 'stats' | 'deleted' | 'settings' | 'manual'

interface Props {
  existingEvents: RichEvent[]
  userName: string
  userRole: string
  config: EventConfig
}

export function ManagerClient({ existingEvents, userName, userRole, config: initialConfig }: Props) {
  const [tab,         setTab]         = useState<ManagerTab>('stats')
  const [staged,      setStaged]      = useState<StagedEvent[]>([])
  const [saving,      setSaving]      = useState(false)
  const [allEvents,   setAllEvents]   = useState<RichEvent[]>(existingEvents)
  const [showCreate,  setShowCreate]  = useState(false)
  const [config,      setConfig]      = useState<EventConfig>(initialConfig)

  const handleStage = useCallback((raw: StagedEvent[]) => {
    const withDups = detectDuplicates(raw, allEvents)
    setStaged(withDups)
    setTab('review')
  }, [allEvents])

  async function handleSaveDrafts() {
    const toSave = staged.filter(e => e.selected)
    if (!toSave.length) return
    setSaving(true)
    try {
      const results = await Promise.all(toSave.map(ev =>
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: ev.title, event_type: ev.event_type, organization: ev.organization,
            domain: ev.domain, location: ev.location, start_at: ev.start_at,
            end_at: ev.end_at, description: ev.description,
            participants_url: ev.participants_url, team_members: ev.team_members,
            status: 'draft',
          }),
        }).then(r => r.json())
      ))
      setAllEvents(prev => [...prev, ...results.map((r: ExistingEvent) => ({ ...r, going_count: 0, interested_count: 0, capacity: null, team_members: null, event_type: null, location: null } as RichEvent))])
      setStaged(prev => prev.filter(e => !e.selected))
      setTab('drafts')
    } finally { setSaving(false) }
  }

  function handleCreated(ev: ExistingEvent) {
    setAllEvents(prev => [...prev, { ...ev, going_count: 0, interested_count: 0, capacity: null, team_members: null, event_type: null, location: null } as RichEvent])
  }

  function handleEventUpdated(id: string, patch: Partial<RichEvent>) {
    setAllEvents(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  function handleRestored(id: string) {
    setAllEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'draft' } : e))
  }

  const draftCount   = allEvents.filter(e => e.status === 'draft').length
  const deletedCount = allEvents.filter(e => e.status === 'deleted').length

  const TABS: { key: ManagerTab; label: string; count?: number }[] = [
    { key: 'import',   label: 'Import'   },
    { key: 'review',   label: 'Review',   count: staged.length || undefined },
    { key: 'drafts',   label: 'Drafts',   count: draftCount || undefined },
    { key: 'edit',     label: 'Edit'     },
    { key: 'stats',    label: 'Stats'    },
    { key: 'deleted',  label: 'Deleted',  count: deletedCount || undefined },
    { key: 'settings', label: 'Settings' },
    { key: 'manual',   label: 'Manual'   },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans','Geist',sans-serif", color: C.text }}>

      {/* Topbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 48, background: C.text, borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/skelar-mark.png" alt="SKELAR" width={22} height={22} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff' }}>SKELAR</span>
          </Link>
          <div style={{ width: 1, height: 16, background: '#444' }} />
          <Link href="/events" style={{ fontSize: 11, fontWeight: 600, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Events</Link>
          <span style={{ color: '#555', fontSize: 11 }}>/</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.brand, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Manager</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#fff', padding: '5px 14px', border: 'none', borderRadius: 6, background: C.brand, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            New event
          </button>
          <Link href="/events?preview=1" style={{ fontSize: 12, fontWeight: 600, color: '#aaa', padding: '5px 10px', border: '1px solid #444', borderRadius: 6, textDecoration: 'none' }}>
            👁 User view
          </Link>
          <span style={{ fontSize: 12, color: '#aaa' }}>{userName}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.brand, padding: '2px 6px', background: '#ffffff14', borderRadius: 4 }}>{userRole.toUpperCase()}</span>
          <a href="/auth/logout" style={{ fontSize: 12, color: '#888', padding: '5px 10px', border: '1px solid #444', borderRadius: 6, textDecoration: 'none' }}>Log out</a>
        </div>
      </nav>

      {/* Header */}
      <div style={{ background: C.text, color: '#fff', padding: '20px 24px 0', borderBottom: '1px solid #222' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>Events Manager</h1>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(({ key, label, count }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: '8px 18px', fontSize: 12, fontWeight: 600,
                border: `1px solid ${tab === key ? '#fff' : '#555'}`,
                borderRadius: key === 'import' ? '6px 0 0 6px' : key === 'manual' ? '0 6px 6px 0' : '0',
                background: tab === key ? '#fff' : 'transparent',
                color: tab === key ? C.text : '#aaa',
                cursor: 'pointer', fontFamily: 'inherit',
                marginLeft: key === 'import' ? 0 : -1,
                position: 'relative', zIndex: tab === key ? 1 : 0,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {label}
                {count !== undefined && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: tab === key ? C.brand : '#ffffff33', color: tab === key ? '#fff' : '#ddd' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>
        {tab === 'import'   && <ImportTab onStage={handleStage} existingCount={allEvents.filter(e => e.status !== 'deleted').length} />}
        {tab === 'review'   && <ReviewTab staged={staged} onChange={setStaged} onSaveDrafts={handleSaveDrafts} saving={saving} />}
        {tab === 'drafts'   && <DraftsTab initialDrafts={allEvents} />}
        {tab === 'edit'     && <EditTab events={allEvents} config={config} onEventUpdated={handleEventUpdated} />}
        {tab === 'stats'    && <StatsTab events={allEvents} teams={config.teams ?? []} />}
        {tab === 'deleted'  && <DeletedTab initialDeleted={allEvents} onRestore={handleRestored} />}
        {tab === 'settings' && <SettingsTab config={config} onSave={setConfig} />}
        {tab === 'manual'   && <ManualTab />}
      </main>

      {showCreate && (
        <CreateEventForm onClose={() => setShowCreate(false)} onCreated={handleCreated} teams={config.teams ?? []} locationOptions={config.locations.length > 0 ? config.locations : [...LOCATIONS]} />
      )}
    </div>
  )
}
