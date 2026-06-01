'use client'
import React, { useState } from 'react'
import { C } from './shared'

export function ManualTab() {
  const [lang, setLang] = useState<'user' | 'tech'>('user')

  const prose: React.CSSProperties = { fontSize: 14, color: '#374151', lineHeight: 1.75 }
  const h2: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: C.text, margin: '28px 0 10px', paddingBottom: 8, borderBottom: `2px solid ${C.border}` }
  const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: C.text, margin: '20px 0 6px' }
  const li: React.CSSProperties = { marginBottom: 6, paddingLeft: 4 }
  const code: React.CSSProperties = { fontFamily: 'monospace', fontSize: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 6px' }
  const chip = (label: string, color: string, bg: string) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: bg, color, border: `1px solid ${color}33`, whiteSpace: 'nowrap' as const, marginRight: 6 }}>{label}</span>
  )
  const tip = (text: string) => (
    <div style={{ padding: '10px 14px', background: C.blueBg, border: `1px solid ${C.blue}33`, borderRadius: 8, fontSize: 13, color: '#1e40af', marginBottom: 12 }}>
      💡 {text}
    </div>
  )

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Events Manager Manual</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Version 0.4 · SKELAR Vault · Updated May 2026</div>
        </div>
        <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setLang('user')} style={{ padding: '7px 18px', fontSize: 12, fontWeight: 700, border: 'none', background: lang === 'user' ? C.text : C.surface, color: lang === 'user' ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            For users
          </button>
          <button onClick={() => setLang('tech')} style={{ padding: '7px 18px', fontSize: 12, fontWeight: 700, border: 'none', borderLeft: `1px solid ${C.border}`, background: lang === 'tech' ? C.text : C.surface, color: lang === 'tech' ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            Technical
          </button>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 32px', ...prose }}>
        {lang === 'user' ? (
          <>
            <div style={{ padding: '12px 16px', background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10, fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 20 }}>
              ✅ This guide covers everything you need to manage events in SKELAR Vault v0.4
            </div>

            <div style={h2}>What is this system?</div>
            <p>Events Manager is a centralized tool for creating, publishing, and tracking corporate events for SKELAR and GENESIS. It gives the team a single calendar to see upcoming courses, intensives, meetups, and internal events — with filtering, RSVP, and analytics.</p>

            <div style={h2}>Tab-by-tab guide</div>

            <div style={h3}>📥 Import</div>
            <p>Add events in bulk from three sources:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li style={li}><strong>CSV upload</strong> — drag &amp; drop or browse a file. Required columns: <span style={code}>title, start_date, end_date</span>. Optional: <span style={code}>event_type, organization, domain, location, description, team_members</span> (separate multiple with <span style={code}>|</span>)</li>
              <li style={li}><strong>Notion import</strong> — paste a public Notion page URL, the scraper extracts events automatically</li>
              <li style={li}><strong>Genesis.com.ua scrape</strong> — one click to pull the latest events from the Genesis public calendar</li>
            </ul>
            {tip('After import, events land in Review — you can deselect duplicates before saving.')}

            <div style={h3}>🔍 Review</div>
            <p>After import, each event is tagged: {chip('New', C.green, C.greenBg)}{chip('Possible dup', C.yellow, C.yellowBg)}{chip('Duplicate', C.brand, C.brandBg)}</p>
            <p>Deselect events you don't want to save, then click <strong>Save as Drafts</strong>. All saved events land in Drafts.</p>

            <div style={h3}>📋 Drafts</div>
            <p>All unpublished events. From here you can:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li style={li}><strong>Publish now</strong> — makes the event visible to all users immediately</li>
              <li style={li}><strong>Schedule publish</strong> — set a date/time when the event should go live (📅 button)</li>
              <li style={li}><strong>Delete</strong> — soft-delete (recoverable from the Deleted tab)</li>
            </ul>

            <div style={h3}>✏️ Edit</div>
            <p>Inline table for quick edits. Click any cell to edit it in place:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li style={li}><strong>Title, Location</strong> — click → type → Enter or click away to save</li>
              <li style={li}><strong>Status, Org, Type, Domain</strong> — dropdown that saves immediately on change</li>
              <li style={li}><strong>Start / End dates</strong> — click → date picker → click away</li>
              <li style={li}><strong>Capacity</strong> — click → number → Enter to save</li>
              <li style={li}><strong>Team</strong> — click the "👤 N" button to expand the team member picker for that row</li>
            </ul>

            <div style={h3}>📊 Stats</div>
            <p>Analytics for any time period. Use the <strong>‹ Month ›</strong> navigator or presets (Last 3 months / This year / All time).</p>
            <ul style={{ paddingLeft: 20 }}>
              <li style={li}><strong>Cards</strong> — total events, published, drafts, going RSVPs, interested count for the selected period</li>
              <li style={li}><strong>Engagement table</strong> — click any row to expand the attendee list and copy emails for newsletters</li>
              <li style={li}><strong>Team member activity</strong> — who appeared in how many events in the period</li>
            </ul>
            {tip('Open the attendee list and click "Copy emails" to get a ready-to-paste email list for invitations or follow-ups.')}

            <div style={h3}>🗑 Deleted</div>
            <p>Soft-deleted events. Click <strong>↩ Restore</strong> to move them back to Drafts.</p>

            <div style={h3}>⚙️ Settings</div>
            <p>Configure the global options used across all events:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li style={li}><strong>Domains</strong> — tags like "academy", "tech", "analytics". Type a value + Enter to add.</li>
              <li style={li}><strong>Locations</strong> — location options (Online, Kyiv, Warsaw…). Same tag-input.</li>
              <li style={li}><strong>Event Types</strong> — Course, Intensive, Event, Lecture, Other. You can add custom types with custom colors.</li>
              <li style={li}><strong>Teams</strong> — named groups for responsible persons. Each team has a color used on event cards and in Stats.</li>
            </ul>
            {tip('Remember to click "Save settings" after making changes — settings apply globally across all users immediately.')}

            <div style={h2}>Roles &amp; access</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${C.border}`, fontWeight: 700 }}>Role</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${C.border}`, fontWeight: 700 }}>Can see</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${C.border}`, fontWeight: 700 }}>Can edit</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['User', 'Published events only', 'Own RSVPs only'],
                  ['Manager', 'All events (incl. drafts)', 'Full access to Manager — create, edit, publish, delete'],
                  ['Admin', 'Everything', 'Full access + cannot be restricted'],
                ].map(([role, see, edit]) => (
                  <tr key={role}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border2}`, fontWeight: 600 }}>{role}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border2}` }}>{see}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border2}` }}>{edit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 12, fontSize: 13, color: C.muted }}>Roles are set in the user Profiles table in Supabase. Set <span style={code}>role = 'manager'</span> to grant manager access.</p>
          </>
        ) : (
          <>
            <div style={{ padding: '12px 16px', background: '#fef3c7', border: `1px solid ${C.yellow}44`, borderRadius: 10, fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 20 }}>
              ⚙️ Technical reference for developers — SKELAR Vault Events v0.4
            </div>

            <div style={h2}>Architecture overview</div>
            <p><strong>Stack:</strong> Next.js 14 App Router · TypeScript · Supabase (PostgreSQL + Auth + RLS) · PostgREST · Inline CSS (no Tailwind)</p>
            <p><strong>Key directory:</strong> <span style={code}>apps/hub/events/</span> — all events logic lives here (components, lib, types, API routes)</p>

            <div style={h2}>Database schema</div>
            <div style={h3}>corporate_events</div>
            <p>Core events table. Key columns:</p>
            <ul style={{ paddingLeft: 20, fontFamily: 'monospace', fontSize: 12 }}>
              <li style={li}>id uuid PK · title text · description text</li>
              <li style={li}>start_at / end_at timestamptz</li>
              <li style={li}>location text · event_type text (course/event/intensive/lecture/other)</li>
              <li style={li}>status text — draft | published | deleted | cancelled</li>
              <li style={li}>organization text — skelar | genesis</li>
              <li style={li}>domain text · participants_url text</li>
              <li style={li}>team_members text[] — encoded as <span style={{ ...code, fontFamily: 'monospace' }}>"Name::TeamName"</span> or plain <span style={{ ...code, fontFamily: 'monospace' }}>"Name"</span></li>
              <li style={li}>publish_at timestamptz — scheduled publish time (null = manual only)</li>
              <li style={li}>capacity int · cover_emoji text · cover_color text</li>
            </ul>

            <div style={h3}>event_rsvps</div>
            <p>Composite PK <span style={code}>(event_id, user_id)</span>. Status: <span style={code}>going | interested | not_going</span>. Full RLS — users manage only their own RSVPs.</p>

            <div style={h3}>events_with_counts (view)</div>
            <p>LEFT JOIN of <span style={code}>corporate_events</span> with aggregated <span style={code}>event_rsvps</span>. Adds <span style={code}>going_count</span> and <span style={code}>interested_count</span> (bigint — always convert with <span style={code}>Number()</span> in JS).</p>
            <p><strong>⚠ Important:</strong> PostgreSQL expands <span style={code}>e.*</span> at view creation time. If you add a column to <span style={code}>corporate_events</span>, you must recreate the view via a new migration.</p>

            <div style={h3}>event_config</div>
            <p>Key-value store: <span style={code}>{`{ id: TEXT, values: JSONB }`}</span>. Rows: <span style={code}>domains</span>, <span style={code}>locations</span>, <span style={code}>event_types</span>, <span style={code}>teams</span>. PUT API at <span style={code}>/api/events/config</span> upserts any key.</p>

            <div style={h2}>RLS policy hierarchy</div>
            <ul style={{ paddingLeft: 20 }}>
              <li style={li}><strong>events_read_published</strong> — authenticated users see published events; admin/manager see all</li>
              <li style={li}><strong>events_admin_write</strong> — admin/manager can INSERT/UPDATE/DELETE</li>
              <li style={li}><strong>rsvps_read</strong> — any auth user can read RSVPs for published events</li>
              <li style={li}><strong>rsvps_own</strong> — users manage only their own RSVP rows</li>
            </ul>
            <p>Role check uses <span style={code}>profiles.role IN ('admin','manager')</span>. Manager access to the manager page is controlled by <span style={code}>events/lib/auth.ts → requireEventsAccess()</span>.</p>

            <div style={h2}>Key API routes</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Route</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `2px solid ${C.border}` }}>Method</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', borderBottom: `2px solid ${C.border}`, fontFamily: 'inherit', fontSize: 11 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['/api/events', 'POST', 'Create event (admin/manager)'],
                  ['/api/events/[id]', 'PUT', 'Update any field — status, title, dates, etc.'],
                  ['/api/events/[id]', 'DELETE', 'Soft-delete (sets status=deleted)'],
                  ['/api/events/[id]/rsvp', 'POST', 'RSVP for authenticated user'],
                  ['/api/events/[id]/attendees', 'GET', 'List attendees via get_event_attendees() RPC'],
                  ['/api/events/bulk-publish', 'POST', 'Publish array of event IDs, optional publish_at'],
                  ['/api/events/config', 'GET/PUT', 'Read / upsert event_config rows'],
                  ['/api/events/scrape', 'POST', 'Scrape events from a URL'],
                ].map(([route, method, desc]) => (
                  <tr key={route + method}>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${C.border2}` }}>{route}</td>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${C.border2}`, color: C.brand, fontWeight: 700 }}>{method}</td>
                    <td style={{ padding: '7px 10px', borderBottom: `1px solid ${C.border2}`, fontFamily: 'inherit', fontSize: 12 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={h2}>Team member encoding</div>
            <p>The <span style={code}>team_members text[]</span> column uses a <span style={code}>"Name::TeamName"</span> convention. Plain <span style={code}>"Name"</span> is backward-compatible (no team tag).</p>
            <p>Helper function in <span style={code}>events/types/index.ts</span>: <span style={code}>parseTeamMember(s)</span> → <span style={code}>{`{ name, team }`}</span></p>

            <div style={h2}>Scheduled publishing</div>
            <p>When <span style={code}>publish_at</span> is set on a draft, a cron job (<span style={code}>events_publish_due</span>) runs every 5 minutes and sets <span style={code}>status = 'published'</span> for events where <span style={code}>publish_at {'<='} now()</span>.</p>

            <div style={h2}>Bigint gotcha</div>
            <p>PostgreSQL <span style={code}>COUNT()</span> aggregates return as <span style={code}>bigint</span>, which Supabase JS serializes as a <strong>string</strong> (not a number). Always call <span style={code}>Number(e.going_count ?? 0)</span> in the server component before passing to client components. Arithmetic on raw values causes silent string concatenation bugs.</p>

            <div style={h2}>How to add a new column</div>
            <ol style={{ paddingLeft: 22 }}>
              <li style={li}>Add a migration: <span style={code}>ALTER TABLE corporate_events ADD COLUMN ...</span></li>
              <li style={li}><strong>Recreate the view:</strong> add another migration that DROPs and re-CREATEs <span style={code}>events_with_counts</span> explicitly listing all columns (including the new one)</li>
              <li style={li}>Update the Supabase select query in <span style={code}>apps/hub/app/events/manager/page.tsx</span> and <span style={code}>apps/hub/app/events/page.tsx</span></li>
              <li style={li}>Add the field to the <span style={code}>RichEvent</span> / <span style={code}>ExistingEvent</span> interfaces</li>
              <li style={li}>Update <span style={code}>CreateEventForm</span> + <span style={code}>EditTab</span> UI as needed</li>
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
