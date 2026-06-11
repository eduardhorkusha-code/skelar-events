'use client'
import React, { useEffect, useState } from 'react'
import { C } from './shared'

interface LogEntry {
  id: string
  created_at: string
  level: 'info' | 'warn' | 'error'
  scope: string | null
  user_email: string | null
  message: string
  metadata: Record<string, unknown> | null
}

const LEVEL_COLOR: Record<string, string> = {
  info:  '#6b7280',
  warn:  '#f59e0b',
  error: '#ef4444',
}

export function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/logs')
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: C.muted, padding: 32, textAlign: 'center' }}>Loading logs…</div>
  if (error)   return <div style={{ color: '#ef4444', padding: 32 }}>Error: {error}</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>System Logs</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Last 48 hours · {logs.length} entries</div>
        </div>
        <button
          onClick={() => { setLoading(true); fetch('/api/admin/logs').then(r => r.json()).then(d => { setLogs(d.logs ?? []); setLoading(false) }) }}
          style={{ fontSize: 12, color: C.muted, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 48, fontSize: 13 }}>No log entries in the last 48 hours</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {logs.map(log => (
            <div key={log.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: LEVEL_COLOR[log.level] ?? C.muted, minWidth: 36, marginTop: 1, textTransform: 'uppercase' }}>
                {log.level}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: '#e5e7eb' }}>{log.message}</span>
                  {log.user_email && (
                    <span style={{ fontSize: 11, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '0 6px' }}>{log.user_email}</span>
                  )}
                  {log.scope && (
                    <span style={{ fontSize: 10, color: C.muted }}>[{log.scope}]</span>
                  )}
                </div>
                {log.metadata && (
                  <pre style={{ fontSize: 10, color: C.muted, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' as const }}>
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
              <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap' as const, marginTop: 1 }}>
                {new Date(log.created_at).toLocaleString('uk-UA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
