# Events v2 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 features to skelar-events: calendar specific-date markers, optional time visibility, owner field, internal tags, CRM links, configurable sub-dates, Notion footer link, and light refactor.

**Architecture:** One SQL migration adds 6 columns to `corporate_events`. `EventConfig` JSON gains 3 new keys (no migration needed — stored in Redis). UI changes are split across `calendar-utils.ts` (pure functions), `EventsPageClient.tsx` (calendar, event card, footer, edit form), and `settings-tab.tsx` (manager config).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (PostgreSQL), Tailwind v4, Vitest

**Spec:** `docs/superpowers/specs/2026-06-11-events-v2-features-design.md`

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/20260611000000_events_v2.sql` | NEW — 6 new columns |
| `events/types/index.ts` | Add fields to `CorporateEvent` + `EventConfig` |
| `events/lib/calendar-utils.ts` | Remove ongoing anchor; add `subDatesByDay` |
| `events/lib/__tests__/calendar-utils.test.ts` | NEW — tests for calendar utils |
| `events/components/EventsPageClient.tsx` | Calendar (A,F,H), edit form (C,D,E,F,H), footer (B), owner display (D), links (E) |
| `events/components/manager/settings-tab.tsx` | notion_url, sub_date_slots, internal_tags config (B,C,F) |
| `app/api/events/[id]/route.ts` | Include new fields in PUT handler allowlist |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260611000000_events_v2.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260611000000_events_v2.sql
ALTER TABLE corporate_events
  ADD COLUMN IF NOT EXISTS owner         text,
  ADD COLUMN IF NOT EXISTS tags          text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ashby_url     text,
  ADD COLUMN IF NOT EXISTS long_list_url text,
  ADD COLUMN IF NOT EXISTS sub_dates     text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_time     boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply migration to local / production Supabase**

```bash
# If using Supabase CLI:
supabase db push
# Or apply via Supabase Dashboard → SQL Editor → paste and run the migration
```

Expected: no errors, columns appear in `public.corporate_events` table.

- [ ] **Step 3: Verify columns exist**

```bash
# In Supabase SQL Editor:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'corporate_events'
  AND column_name IN ('owner','tags','ashby_url','long_list_url','sub_dates','show_time');
```

Expected: 6 rows returned.

- [ ] **Step 4: Commit migration**

```bash
cd /Users/eduard.horkusha/skelar-events
git add supabase/migrations/20260611000000_events_v2.sql
git commit -m "feat(db): add owner, tags, links, sub_dates, show_time columns"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `events/types/index.ts`

- [ ] **Step 1: Update `EventConfig` interface**

In `events/types/index.ts`, replace the `EventConfig` interface:

```typescript
export interface EventConfig {
  domains:         string[]
  locations:       string[]
  event_types:     EventTypeConfig[]
  teams?:          TeamConfig[]
  contact_email?:  string
  notion_url?:     string
  sub_date_slots?: [string, string, string]
  internal_tags?:  string[]
}
```

- [ ] **Step 2: Update `CorporateEvent` interface**

Add after the `intensive_milestones` line:

```typescript
  // v2 fields
  owner?:          string | null
  tags?:           string[]
  ashby_url?:      string | null
  long_list_url?:  string | null
  sub_dates?:      string[]
  show_time?:      boolean
```

- [ ] **Step 3: Add default slot constant**

At the bottom of `events/types/index.ts`, add:

```typescript
export const DEFAULT_SUB_DATE_SLOTS: [string, string, string] = [
  'Ярмарок вакансій',
  'Short list',
  '',
]

export const DEFAULT_INTERNAL_TAGS = ['Offline', 'Validation', 'Invite/long list']
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/eduard.horkusha/skelar-events && ./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors (new optional fields don't break existing code).

- [ ] **Step 5: Commit**

```bash
git add events/types/index.ts
git commit -m "feat(types): add v2 fields to CorporateEvent and EventConfig"
```

---

## Task 3: calendar-utils.ts — Remove Ongoing, Add subDatesByDay

**Files:**
- Modify: `events/lib/calendar-utils.ts`
- Create: `events/lib/__tests__/calendar-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `events/lib/__tests__/calendar-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { eventsByDay, subDatesByDay } from '../calendar-utils'
import type { CorporateEvent } from '../../types'

const base: CorporateEvent = {
  id: '1', title: 'Test', description: null,
  start_at: '2026-06-10T10:00:00Z', end_at: '2026-06-12T10:00:00Z',
  location: null, location_url: null, event_type: 'event',
  organization: null, domain: null, participants_url: null,
  team_members: null, capacity: null, cover_emoji: null, cover_color: null,
  status: 'published', created_by: null, created_at: '', updated_at: '',
  going_count: 0, interested_count: 0, my_rsvp: null,
}

describe('eventsByDay', () => {
  it('shows start and end chips only — no ongoing anchor', () => {
    const monthFirst = '2026-07-01'
    // Event ends July 5 but started June 10 — should NOT appear as ongoing on July 1
    const ev = { ...base, start_at: '2026-06-10T10:00:00Z', end_at: '2026-07-05T10:00:00Z' }
    const map = eventsByDay([ev], monthFirst)
    const july1 = map.get('2026-07-01')
    expect(july1?.some(e => e.isOngoing)).toBeFalsy()
  })

  it('maps start and end to correct days', () => {
    const map = eventsByDay([base])
    expect(map.get('2026-06-10')?.[0].isEnd).toBe(false)
    expect(map.get('2026-06-12')?.[0].isEnd).toBe(true)
  })
})

describe('subDatesByDay', () => {
  it('maps sub_dates to correct days with slot labels', () => {
    const ev = { ...base, sub_dates: ['2026-06-15', '', '2026-06-20'] }
    const slots: [string, string, string] = ['Ярмарок', 'Short list', 'Custom']
    const map = subDatesByDay([ev], slots)
    expect(map.get('2026-06-15')?.[0].label).toBe('Ярмарок')
    expect(map.get('2026-06-20')?.[0].label).toBe('Custom')
    expect(map.has('2026-06-16')).toBe(false)
  })

  it('skips empty sub_date slots', () => {
    const ev = { ...base, sub_dates: ['', '2026-06-18', ''] }
    const slots: [string, string, string] = ['A', 'B', 'C']
    const map = subDatesByDay([ev], slots)
    expect(map.size).toBe(1)
    expect(map.get('2026-06-18')?.[0].label).toBe('B')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/eduard.horkusha/skelar-events && npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: `subDatesByDay` not found, `ongoing` test likely passes (existing behavior).

- [ ] **Step 3: Update `calendar-utils.ts`**

In `eventsByDay`, remove the ongoing-anchor block entirely (lines 71–84 in current file). The function should only push start chip and end chip:

```typescript
export function eventsByDay(
  events: CorporateEvent[],
  _monthFirstDay?: string,   // kept for API compat, no longer used
): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>()

  for (const e of events) {
    const startDay = isoDate(new Date(e.start_at))
    const endDay   = isoDate(new Date(e.end_at))

    const startArr = map.get(startDay) ?? []
    startArr.push({ event: e, isEnd: false, isOngoing: false })
    map.set(startDay, startArr)

    if (endDay !== startDay) {
      const endArr = map.get(endDay) ?? []
      endArr.push({ event: e, isEnd: true, isOngoing: false })
      map.set(endDay, endArr)
    }
  }

  return map
}
```

Also add the `subDatesByDay` function after `eventsByDay`:

```typescript
export type SubDateEntry = {
  event: CorporateEvent
  label: string
  slotIndex: number
}

export function subDatesByDay(
  events: CorporateEvent[],
  slots: [string, string, string],
): Map<string, SubDateEntry[]> {
  const map = new Map<string, SubDateEntry[]>()

  for (const e of events) {
    const dates = e.sub_dates ?? []
    dates.forEach((dateStr, i) => {
      if (!dateStr || !slots[i]) return
      const day = isoDate(new Date(dateStr))
      const arr = map.get(day) ?? []
      arr.push({ event: e, label: slots[i], slotIndex: i })
      map.set(day, arr)
    })
  }

  return map
}
```

Also update `CalendarEntry` comment to reflect `isOngoing` is now always `false` (kept for type compat):

```typescript
export type CalendarEntry = {
  event:     CorporateEvent
  isEnd:     boolean   // last day of the event
  isOngoing: boolean   // always false — ongoing display removed in v2
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/eduard.horkusha/skelar-events && npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all tests in `calendar-utils.test.ts` pass.

- [ ] **Step 5: Type-check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add events/lib/calendar-utils.ts events/lib/__tests__/calendar-utils.test.ts
git commit -m "feat(calendar): remove ongoing anchors; add subDatesByDay helper"
```

---

## Task 4: Settings Tab — notion_url, sub_date_slots, internal_tags

**Files:**
- Modify: `events/components/manager/settings-tab.tsx`

- [ ] **Step 1: Add `notion_url` input**

In `settings-tab.tsx`, find where `contact_email` is rendered. Add a `notion_url` field directly after it. The `SettingsTab` receives `config: EventConfig` and `onSave`. Add state:

```typescript
const [notionUrl, setNotionUrl] = useState(config.notion_url ?? '')
```

Add to the save payload:
```typescript
notion_url: notionUrl.trim() || undefined,
```

Add the input UI after the contact_email block:
```tsx
<div>
  <label style={{ ...labelStyle }}>Notion URL (footer link)</label>
  <input
    value={notionUrl}
    onChange={e => setNotionUrl(e.target.value)}
    placeholder="https://notion.so/..."
    style={inp}
  />
  <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
    Displayed in the footer alongside the contact email.
  </p>
</div>
```

- [ ] **Step 2: Add sub_date_slots inputs (3 fields)**

Add state:
```typescript
const defaultSlots = config.sub_date_slots ?? DEFAULT_SUB_DATE_SLOTS
const [slot0, setSlot0] = useState(defaultSlots[0])
const [slot1, setSlot1] = useState(defaultSlots[1])
const [slot2, setSlot2] = useState(defaultSlots[2])
```

Import `DEFAULT_SUB_DATE_SLOTS` from `../../types`.

Add to save payload:
```typescript
sub_date_slots: [slot0.trim(), slot1.trim(), slot2.trim()] as [string, string, string],
```

Add UI (a new section "Sub-date slots"):
```tsx
<div>
  <label style={{ ...labelStyle }}>Additional date slot names</label>
  <p style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
    Up to 3 named date slots per event. Leave empty to disable a slot.
  </p>
  {[
    [slot0, setSlot0, 'Slot 1 (e.g. Ярмарок вакансій)'],
    [slot1, setSlot1, 'Slot 2 (e.g. Short list)'],
    [slot2, setSlot2, 'Slot 3 (custom)'],
  ].map(([val, setter, ph], i) => (
    <input
      key={i}
      value={val as string}
      onChange={e => (setter as (v: string) => void)(e.target.value)}
      placeholder={ph as string}
      style={{ ...inp, marginBottom: 6 }}
    />
  ))}
</div>
```

- [ ] **Step 3: Add internal_tags config**

Add state:
```typescript
const [internalTags, setInternalTags] = useState<string[]>(
  config.internal_tags ?? DEFAULT_INTERNAL_TAGS
)
```

Import `DEFAULT_INTERNAL_TAGS` from `../../types`.

Add to save payload:
```typescript
internal_tags: internalTags,
```

Reuse the existing `TagInput` component (already in settings-tab.tsx):
```tsx
<div>
  <label style={{ ...labelStyle }}>Internal tag options</label>
  <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
    Tags visible only to editors/admins. Used for analytics.
  </p>
  <TagInput values={internalTags} onChange={setInternalTags} placeholder="Add tag…" />
</div>
```

- [ ] **Step 4: Type-check + run tests**

```bash
./node_modules/.bin/tsc --noEmit && npm test
```

Expected: 0 errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add events/components/manager/settings-tab.tsx
git commit -m "feat(settings): notion_url, sub_date_slots, internal_tags config"
```

---

## Task 5: Edit Form — New Fields (D, C, E, F, H)

**Files:**
- Modify: `events/components/EventsPageClient.tsx` (AdminEventForm function, ~line 360–550)

The `AdminEventForm` function receives `initial: Partial<CorporateEvent>` and calls `onSave(data)`.

- [ ] **Step 1: Add new state variables at top of AdminEventForm**

Find the block of `useState` calls in `AdminEventForm` (~line 374). Add after existing state:

```typescript
const [showTime,    setShowTime]    = useState(initial.show_time    ?? false)
const [owner,       setOwner]       = useState(initial.owner        ?? '')
const [tags,        setTags]        = useState<string[]>(initial.tags ?? [])
const [ashbyUrl,    setAshbyUrl]    = useState(initial.ashby_url    ?? '')
const [longListUrl, setLongListUrl] = useState(initial.long_list_url ?? '')
const [subDates,    setSubDates]    = useState<[string,string,string]>(() => {
  const sd = initial.sub_dates ?? []
  return [sd[0] ?? '', sd[1] ?? '', sd[2] ?? '']
})
```

- [ ] **Step 2: Include new fields in the save payload**

Find the `handleSave` function or the object passed to `onSave`. Add the new fields:

```typescript
show_time:      showTime,
owner:          owner.trim() || null,
tags,
ashby_url:      ashbyUrl.trim()    || null,
long_list_url:  longListUrl.trim() || null,
sub_dates:      subDates,
```

- [ ] **Step 3: Add show_time toggle to the form**

After the end date/time inputs, add:

```tsx
{/* show_time toggle */}
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
  <div>
    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Show time to users</span>
    <span style={{ display: 'block', fontSize: 11, color: C.muted, marginTop: 2 }}>If off, only the date is shown</span>
  </div>
  <button
    type="button"
    onClick={() => setShowTime(v => !v)}
    style={{
      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
      background: showTime ? C.brand : C.border,
      position: 'relative', flexShrink: 0, transition: 'background 0.2s',
    }}
  >
    <span style={{
      position: 'absolute', top: 3, left: showTime ? 21 : 3,
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      transition: 'left 0.15s',
    }} />
  </button>
</div>
```

- [ ] **Step 4: Add owner input**

After the team_members section:

```tsx
<div>
  <span style={lbl}>Відповідальна (Recruiting Owner)</span>
  <input
    value={owner}
    onChange={e => setOwner(e.target.value)}
    placeholder="e.g. Kateryna Zabotkina"
    style={{ ...inputStyle }}
  />
</div>
```

(`lbl` and `inputStyle` are the existing label/input styles used throughout the form.)

- [ ] **Step 5: Add internal tags selector (editor/admin only)**

The `AdminEventForm` is only openable by admins/editors (guarded at call site by `isAdmin`). No `canEdit` prop needed — tags and links always visible inside this form. First, add `config` to `AdminEventForm` props:

```typescript
// Before the function body, update the props:
function AdminEventForm({ initial, onSave, onDelete, onClose, saving, saveError,
  domains, locations, eventTypes, teams, config }: {
  // ...existing props...
  config?: EventConfig
})
```

Update the call site (~line 1428):
```tsx
<AdminEventForm ... config={config} />
```

Add after owner:

```tsx
{canEdit && (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={lbl}>Internal Tags</span>
      <span style={{ fontSize: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1px 7px', color: C.muted }}>
        not visible to users
      </span>
    </div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
      {(internalTagOptions).map(tag => {
        const selected = tags.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => setTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${selected ? C.brand : C.border}`,
              background: selected ? `${C.brand}18` : C.surface,
              color: selected ? C.brand : C.muted,
              fontFamily: 'inherit',
            }}
          >
            {selected ? '✓ ' : ''}{tag}
          </button>
        )
      })}
    </div>
  </div>
)}
```

`internalTagOptions` comes from `config.internal_tags ?? DEFAULT_INTERNAL_TAGS` — pass `config` down to the form or derive it from a prop already available.

- [ ] **Step 6: Add Ashby and Long List URL inputs (editor/admin only)**

```tsx
{canEdit && (
  <div>
    <span style={lbl}>CRM & Recruiting Links</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 18 }}>🏢</span>
      <input
        value={ashbyUrl}
        onChange={e => setAshbyUrl(e.target.value)}
        placeholder="Ashby URL (https://app.ashby.com/...)"
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>📋</span>
      <input
        value={longListUrl}
        onChange={e => setLongListUrl(e.target.value)}
        placeholder="Long List Google Sheet URL"
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 7: Add sub-dates inputs**

Pass `config` (already available in the component tree) to get `sub_date_slots`. Derive active slots:

```typescript
const slots = config?.sub_date_slots ?? DEFAULT_SUB_DATE_SLOTS
const activeSlots = slots.map((label, i) => ({ label, i })).filter(s => s.label)
```

Add UI:

```tsx
{activeSlots.length > 0 && (
  <div>
    <span style={lbl}>Additional Dates</span>
    {activeSlots.map(({ label, i }) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.muted, minWidth: 130 }}>{label}</span>
        <input
          type="date"
          value={subDates[i as 0|1|2]}
          onChange={e => setSubDates(prev => {
            const next = [...prev] as [string,string,string]
            next[i as 0|1|2] = e.target.value
            return next
          })}
          style={{ ...inputStyle }}
        />
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 8: Update `app/api/events/[id]/route.ts` PUT allowlist**

Find the PUT handler. It likely spreads `body` directly or has an explicit field list. Add the 6 new fields to whatever is being passed to `.update()`:

```typescript
// In PUT handler, add to the update object:
owner:          body.owner          ?? null,
tags:           body.tags           ?? [],
ashby_url:      body.ashby_url      ?? null,
long_list_url:  body.long_list_url  ?? null,
sub_dates:      body.sub_dates      ?? [],
show_time:      body.show_time      ?? false,
```

- [ ] **Step 9: Type-check + tests**

```bash
./node_modules/.bin/tsc --noEmit && npm test
```

Expected: 0 errors, all tests pass.

- [ ] **Step 10: Commit**

```bash
git add events/components/EventsPageClient.tsx app/api/events/\[id\]/route.ts
git commit -m "feat(edit-form): owner, tags, links, sub_dates, show_time toggle"
```

---

## Task 6: Calendar View — No Ongoing, Sub-date Markers, show_time

**Files:**
- Modify: `events/components/EventsPageClient.tsx` (MonthCalendar function, ~line 555–742)

- [ ] **Step 1: Remove ongoing chip rendering**

In `MonthCalendar`, inside the `shown.map(...)` block, find the `if (isOngoing)` branch (~line 624). Delete the entire `if (isOngoing) { return (...) }` block. `isOngoing` will always be `false` after Task 3, so this is dead code.

- [ ] **Step 2: Add `subDatesByDay` useMemo**

After the `milestonesByDay` useMemo (~line 565), add:

```typescript
const subDatesMap = useMemo(() => {
  const slots = config?.sub_date_slots ?? DEFAULT_SUB_DATE_SLOTS
  return subDatesByDay(events, slots)
}, [events, config?.sub_date_slots])
```

Import `subDatesByDay`, `SubDateEntry`, and `DEFAULT_SUB_DATE_SLOTS` at the top of the file (they come from `../lib/calendar-utils` and `../types`).

Pass `config` as a prop to `MonthCalendar`:

```typescript
function MonthCalendar({ events, year, month, onEventClick, cfgTypes, config }: {
  events: CorporateEvent[]
  year: number
  month: number
  onEventClick: (e: CorporateEvent) => void
  cfgTypes?: EventTypeConfig[]
  config?: EventConfig
})
```

Update the `MonthCalendar` call site (~line 1398) to pass `config={config}`.

- [ ] **Step 3: Render sub-date chips**

After the `milestonesByDay` rendering block (~line 714), add sub-date chips:

```tsx
{/* Sub-date chips */}
{(subDatesMap.get(dayStr) ?? []).map(({ event: ev, label }: SubDateEntry) => (
  <button
    key={`${ev.id}-sub-${label}`}
    onClick={() => onEventClick(ev)}
    title={`${label}: ${ev.title}`}
    style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 5px', borderRadius: 3,
      fontSize: 10.5, fontWeight: 500,
      background: '#f5f3ff', color: '#6d28d9',
      border: '1px solid #8b5cf6',
      cursor: 'pointer', textAlign: 'left' as const,
      fontFamily: 'inherit', overflow: 'hidden', flexShrink: 0,
    }}
  >
    <span style={{ width: 3, height: 10, borderRadius: 2, background: '#7c3aed', flexShrink: 0, display: 'block' }} />
    <span style={{
      overflow: 'hidden', display: '-webkit-box',
      WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const,
      lineHeight: '14px',
    } as React.CSSProperties}>
      {label}: {ev.title}
    </span>
  </button>
))}
```

- [ ] **Step 4: Apply show_time to date display**

Find the `EventCard` / inline date display (~line 132–138) where `formatTime` is called:

```typescript
// BEFORE:
const singleDay = isoDateUTC(event.start_at) === isoDateUTC(event.end_at)
const dateStr = singleDay
  ? `${formatDate(event.start_at)}, ${formatTime(event.start_at)} – ${formatTime(event.end_at)}`
  : `${formatDate(event.start_at)} → ${formatDate(event.end_at)}`

// AFTER:
const singleDay = isoDateUTC(event.start_at) === isoDateUTC(event.end_at)
const dateStr = singleDay
  ? event.show_time
    ? `${formatDate(event.start_at)}, ${formatTime(event.start_at)} – ${formatTime(event.end_at)}`
    : formatDate(event.start_at)
  : event.show_time
    ? `${formatDate(event.start_at)}, ${formatTime(event.start_at)} → ${formatDate(event.end_at)}, ${formatTime(event.end_at)}`
    : `${formatDate(event.start_at)} → ${formatDate(event.end_at)}`
```

Apply the same `show_time` guard everywhere else time is rendered (Upcoming list, event detail modal header, My Events list). Search for `formatTime(` in `EventsPageClient.tsx` and wrap each with `event.show_time &&`.

- [ ] **Step 5: Type-check + tests**

```bash
./node_modules/.bin/tsc --noEmit && npm test
```

Expected: 0 errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add events/components/EventsPageClient.tsx
git commit -m "feat(calendar): sub-date markers, remove ongoing chips, show_time guard"
```

---

## Task 7: Event Display — Owner, Links, Footer Notion URL

**Files:**
- Modify: `events/components/EventsPageClient.tsx` (EventDetailModal + footer, ~line 200–340 + line 1411)

- [ ] **Step 1: Show owner on event card (visible to all)**

In the event detail display area (inside `EventDetailModal` or the inline detail panel), find where `team_members` is rendered (~line 180–200). After team members, add:

```tsx
{event.owner && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 18 }}>👤</span>
    <div>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 2 }}>
        ВІДПОВІДАЛЬНА
      </span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{event.owner}</span>
    </div>
  </div>
)}
```

- [ ] **Step 2: Show Ashby + Long List links (editor/admin only)**

After the owner block, add (guarded by `canEdit`):

```tsx
{canEdit && (event.ashby_url || event.long_list_url) && (
  <div style={{ display: 'flex', gap: 8, padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
    {event.ashby_url && (
      <a
        href={event.ashby_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
          background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
          textDecoration: 'none',
        }}
      >
        🏢 Ashby
      </a>
    )}
    {event.long_list_url && (
      <a
        href={event.long_list_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
          background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
          textDecoration: 'none',
        }}
      >
        📋 Long List
      </a>
    )}
  </div>
)}
```

- [ ] **Step 3: Add Notion link to footer**

Find the footer block (~line 1411):

```tsx
{config?.contact_email && (
  <div style={{ marginTop: 32, padding: '14px 20px', background: C.surface, ... }}>
    <span style={{ fontSize: 16 }}>✉️</span>
    <span style={{ fontSize: 13, color: C.muted }}>Questions about this platform?</span>
    <a href={`mailto:${config.contact_email}`} ...>{config.contact_email}</a>
  </div>
)}
```

Update the condition to also show when `notion_url` is set, and add the Notion link:

```tsx
{(config?.contact_email || config?.notion_url) && (
  <div style={{ marginTop: 32, padding: '14px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
    {config.contact_email && (
      <>
        <span style={{ fontSize: 16 }}>✉️</span>
        <span style={{ fontSize: 13, color: C.muted }}>Questions about this platform?</span>
        <a href={`mailto:${config.contact_email}`} style={{ fontSize: 13, fontWeight: 600, color: C.brand, textDecoration: 'none' }}>
          {config.contact_email}
        </a>
      </>
    )}
    {config.notion_url && (
      <>
        {config.contact_email && <span style={{ color: C.border }}>|</span>}
        <a
          href={config.notion_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
          </svg>
          Статті про платформу
        </a>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Type-check + tests**

```bash
./node_modules/.bin/tsc --noEmit && npm test
```

Expected: 0 errors, all 35+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add events/components/EventsPageClient.tsx
git commit -m "feat(ui): owner display, recruiter links, notion footer"
```

---

## Task 8: Final Check + GitHub Issues

- [ ] **Step 1: Full type-check and test run**

```bash
cd /Users/eduard.horkusha/skelar-events
git pull --rebase origin main
./node_modules/.bin/tsc --noEmit
npm test
npm run build 2>&1 | tail -20
```

Expected: 0 tsc errors, all tests pass, build succeeds.

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

- [ ] **Step 3: Create GitHub issue and close**

```bash
gh issue create \
  --repo eduardhorkusha-code/skelar-events \
  --title "feat: events v2 — owner, tags, links, sub-dates, show_time, calendar fix" \
  --body "Implements spec: docs/superpowers/specs/2026-06-11-events-v2-features-design.md

Features: A (calendar specific dates), B (footer notion link), C (internal tags), D (owner field), E (ashby+longlist links), F (configurable sub-dates), G (refactor), H (optional show_time)" \
  --label "enhancement"
```

Then close it:

```bash
LAST_COMMIT=$(git rev-parse --short HEAD)
ISSUE_NUM=$(gh issue list --repo eduardhorkusha-code/skelar-events --limit 1 --json number --jq '.[0].number')
gh issue close $ISSUE_NUM \
  --repo eduardhorkusha-code/skelar-events \
  --comment "Done. Commit: $LAST_COMMIT"
```

---

## Definition of Done Checklist

- [ ] Migration applied, all 6 columns exist in `corporate_events`
- [ ] `tsc --noEmit` = 0 errors
- [ ] `npm test` = all tests pass
- [ ] `npm run build` succeeds
- [ ] Calendar shows start/end/sub-date markers only (no ongoing chips)
- [ ] `show_time=false` hides time everywhere; toggle works in edit form
- [ ] Owner field saves and shows "ВІДПОВІДАЛЬНА" on event card
- [ ] Internal tags visible only to editor/admin; toggle works; not shown to viewers
- [ ] Ashby + Long List links visible only to editor/admin with correct icons
- [ ] 3 sub-date slots configurable in Settings; dates appear as purple chips in calendar
- [ ] Notion URL in footer when set in Settings
- [ ] GitHub issue closed with commit hash
