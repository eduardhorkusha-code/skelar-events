'use client'
import React, { useState, useRef } from 'react'
import type { EventType } from '../../types'
import { C, StagedEvent, isoDate, toISO, inp, parseCSV } from './shared'

export function ImportTab({ onStage, existingCount }: {
  onStage: (events: StagedEvent[]) => void
  existingCount: number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging,   setDragging]   = useState(false)
  const [notionUrl,  setNotionUrl]  = useState('')
  const [scrapeUrl,  setScrapeUrl]  = useState('https://genesis.com.ua/events')
  const [loading,    setLoading]    = useState<'notion'|'scrape'|null>(null)
  const [error,      setError]      = useState<string|null>(null)

  function handleFile(file: File) {
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const staged = parseCSV(text)
      if (!staged.length) { setError('Не вдалося розпарсити файл. Перевір формат CSV.'); return }
      onStage(staged)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleScrape() {
    setLoading('scrape')
    setError(null)
    try {
      const res = await fetch('/api/events/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Помилка scraping'); return }

      if (!json.events?.length) {
        setError(`На сторінці "${json.meta?.pageTitle}" не знайдено структурованих даних про події. Спробуй завантажити CSV вручну.`)
        return
      }

      const staged: StagedEvent[] = json.events.map((ev: Record<string, string>, i: number) => ({
        _key: `scrape-${i}-${Date.now()}`,
        title:            ev.title || `Event ${i+1}`,
        event_type:       'event' as EventType,
        organization:     null,
        domain:           null,
        location:         ev.location || null,
        start_at:         ev.start_at || toISO(isoDate(new Date())),
        end_at:           ev.end_at   || ev.start_at || toISO(isoDate(new Date()), '18:00'),
        description:      ev.description || null,
        team_members:     null,
        participants_url: ev.url || null,
        dupStatus: 'clean' as const,
        selected: true,
      }))
      onStage(staged)
    } finally { setLoading(null) }
  }

  const card: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: '20px 22px', marginBottom: 14,
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ background: C.blueBg, border: `1px solid ${C.blue}22`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: C.blue }}>
        <strong>В базі {existingCount} подій.</strong> Після завантаження нових — переходь на вкладку <strong>Review</strong> для перевірки дублікатів.
      </div>

      {error && (
        <div style={{ background: C.brandBg, border: `1px solid ${C.brand}33`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.brand }}>
          {error}
        </div>
      )}

      {/* ── File upload ── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>📋 CSV / Excel файл</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Завантаж файл із подіями. Завантажити шаблон можна нижче.</div>
          </div>
          <a
            href="/templates/events-template.csv"
            download
            style={{ fontSize: 12, fontWeight: 600, color: C.blue, padding: '6px 12px', border: `1px solid ${C.blue}44`, borderRadius: 7, textDecoration: 'none', background: C.blueBg, whiteSpace: 'nowrap' }}
          >
            ↓ Шаблон CSV
          </a>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.blue : C.border}`,
            borderRadius: 10, padding: '32px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? C.blueBg : C.bg,
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Перетягни файл або клікни</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>CSV, .csv — до 5 MB</div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>

        {/* Columns hint */}
        <div style={{ marginTop: 12, padding: '10px 12px', background: C.bg, borderRadius: 7, fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
          title, event_type, organization, domain, location, start_date, end_date, description, participants_url, team_members
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: C.faint }}>
          team_members розділяй через <code>|</code>. event_type: course / event / intensive / lecture. organization: genesis / skelar
        </div>
      </div>

      {/* ── Notion ── */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>🔗 Notion синхронізація</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Вкажи URL або ID бази даних Notion. Потрібна змінна оточення <code>NOTION_TOKEN</code>.
        </div>
        <span style={lbl}>Notion Database URL або ID</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={inp({ flex: 1 })}
            value={notionUrl}
            onChange={e => setNotionUrl(e.target.value)}
            placeholder="https://www.notion.so/… або 1234abc…"
          />
          <button
            disabled={!notionUrl || loading === 'notion'}
            onClick={() => setError('Notion API поки не підключено. Додай NOTION_TOKEN в env і підключи інтеграцію.')}
            style={{ padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none', background: C.text, color: '#fff', cursor: notionUrl ? 'pointer' : 'not-allowed', opacity: notionUrl ? 1 : 0.5, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            {loading === 'notion' ? 'Завантаження…' : 'Синхронізувати'}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
          Щоб підключити: Notion → Settings → Integrations → створи integration → скопіюй токен → додай в env як <code>NOTION_TOKEN</code>
        </div>
      </div>

      {/* ── Genesis scrape ── */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>🌐 Скрейп з Genesis / будь-якого сайту</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Введи URL сторінки з подіями. Автоматично витягуємо JSON-LD structured data. Якщо на сайті немає розмітки — завантаж CSV вручну.
        </div>
        <span style={lbl}>URL сторінки з подіями</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={inp({ flex: 1 })}
            value={scrapeUrl}
            onChange={e => setScrapeUrl(e.target.value)}
            placeholder="https://genesis.com.ua/events"
          />
          <button
            disabled={!scrapeUrl || !!loading}
            onClick={handleScrape}
            style={{ padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none', background: C.text, color: '#fff', cursor: scrapeUrl && !loading ? 'pointer' : 'not-allowed', opacity: scrapeUrl && !loading ? 1 : 0.5, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            {loading === 'scrape' ? 'Скрейпінг…' : 'Завантажити'}
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: C.faint }}>
          Сервер зробить запит від свого імені, тому CORS не заважає. Якщо сайт блокує ботів — результат може бути порожнім.
        </div>
      </div>
    </div>
  )
}
