# Events v2 Features — Design Spec

**Date:** 2026-06-11  
**Status:** APPROVED  
**Repo:** `eduardhorkusha-code/skelar-events`

---

## 1. Overview

8 features across calendar UX, event data model, and manager tooling. One SQL migration, no new tables.

---

## 2. Features

### A. Calendar — specific dates only
**Problem:** Events that span multiple days or carry over from the previous month appear as continuous bars with `→` arrows at the start of each new month.  
**Fix:** Remove continuous-span rendering. Each event appears as discrete markers only on its specific dates:
- `▶` on `start_at` date
- `■` on `end_at` date (if different from start)
- Sub-date markers (see F) on their respective dates

No code outside `EventsPageClient.tsx` calendar rendering logic needs to change.

---

### B. Footer — Notion link
**Field:** `EventConfig.notion_url?: string`  
**Where stored:** Redis (`product_config` table, `scope='events'`), same JSON blob as existing `contact_email`.  
**UI:** Footer shows `contact_email` and, if `notion_url` is set, a Notion-branded link next to it.  
**Settings:** New input in Manager → Settings tab.

---

### C. Internal event tags
**Purpose:** Analytics-only labels not visible to regular users.  
**Default tags:** `Offline`, `Validation`, `Invite/long list`  
**Extensible:** Manager can add custom tags via `EventConfig.internal_tags: string[]` in Settings.  
**Storage:** `corporate_events.tags text[] DEFAULT '{}'`  
**Visibility:** Only users with role `admin` or `editor` can see/edit tags. Hidden from `viewer` role.  
**UI in edit form:** Pill toggle — click to select/deselect. Shows badge "не видно юзерам".

---

### D. Owner (Recruiting Owner)
**Purpose:** Single person responsible for the event from the recruiting side. Visible to all users as "Відповідальна". Used in analytics to identify recruiting owner.  
**Storage:** `corporate_events.owner text DEFAULT NULL`  
**Type:** Free-text name (not a UUID reference). Reason: person may change roles, free-text is more resilient.  
**UI:**
- Edit form: text input labelled "Відповідальна (Recruiting Owner)"
- Event card (public): shown as "Відповідальна: Kateryna Z." below team members
- Analytics: `owner` column available for grouping/filtering

---

### E. Event links (manager-only)
**Two new URL fields:**
- `ashby_url text DEFAULT NULL` — Ashby CRM link (icon: 🏢)
- `long_list_url text DEFAULT NULL` — Long List Google Sheet (icon: 📋)

**Visibility:** Only `admin` / `editor` roles see these links in the event card. Hidden from `viewer`.  
**UI:** Shown as icon + clickable link in event detail panel. In edit form: two URL inputs with icon labels.

---

### F. Configurable sub-dates (3 slots)
**Purpose:** Mark specific dates within an event (e.g., Job Fair, Short list, custom) as separate calendar markers — without creating new events.

**Config (EventConfig):**
```json
"sub_date_slots": ["Ярмарок вакансій", "Short list", ""]
```
- 3 fixed slots, admin sets labels in Settings → Sub-date slots section
- Empty label = slot disabled (not shown in edit form or calendar)

**Per-event data:**
```sql
sub_dates text[] DEFAULT '{}'
```
Index-aligned with `sub_date_slots`: `sub_dates[0]` is the date for `sub_date_slots[0]`, etc. Empty string = not set.

**Calendar display:** Sub-date markers appear in a distinct color (purple) on their date, labelled with the slot name. Shown to all users (not internal).

**Edit form:** 3 date inputs, each labelled with the configured slot name. Hidden if slot label is empty.

---

### G. Refactoring
**Scope:** Targeted improvements only — no unrelated cleanup.  
**Included with this sprint:**
- Extract calendar day-rendering logic from `EventsPageClient.tsx` into a `renderDayEvents(date, events, config)` pure function — required anyway for F
- Extract event link section into a small `EventLinks` component
- `EventsPageClient.tsx` is ~1400 lines; these extractions reduce it without touching unrelated code

---

### H. Optional time visibility
**Problem:** `start_at` / `end_at` are full datetimes. Currently time is always shown. Many events don't have a meaningful time.  
**Solution:** New boolean field `show_time boolean DEFAULT false`.  
**Behavior:**
- `show_time = false` (default): display only the date to users. Example: "June 6, 2026"
- `show_time = true`: display date + time. Example: "June 6, 2026 · 14:00"
- Applies everywhere time is rendered: event card, calendar tooltip, upcoming list
- Existing events default to `false` after migration — editors re-enable where needed

**Edit form:** Toggle "Показувати час юзерам" (default OFF).

---

## 3. DB Migration

One migration file: `supabase/migrations/20260611000000_events_v2.sql`

```sql
ALTER TABLE corporate_events
  ADD COLUMN IF NOT EXISTS owner          text,
  ADD COLUMN IF NOT EXISTS tags           text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ashby_url      text,
  ADD COLUMN IF NOT EXISTS long_list_url  text,
  ADD COLUMN IF NOT EXISTS sub_dates      text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_time      boolean   NOT NULL DEFAULT false;
```

No new tables. No changes to existing columns. Fully additive.

---

## 4. EventConfig changes

`EventConfig` interface (in `events/types/index.ts`):

```typescript
export interface EventConfig {
  domains:         string[]
  locations:       string[]
  event_types:     EventTypeConfig[]
  teams?:          TeamConfig[]
  contact_email?:  string
  // NEW:
  notion_url?:     string          // B — footer link
  sub_date_slots?: [string, string, string]  // F — 3 slot labels
  internal_tags?:  string[]        // C — manager-defined extra tags
}
```

Default `sub_date_slots` if not configured: `["Ярмарок вакансій", "Short list", ""]`  
Default `internal_tags` if not configured: `["Offline", "Validation", "Invite/long list"]`

---

## 5. CorporateEvent type changes

```typescript
export interface CorporateEvent {
  // ... existing fields ...
  // NEW:
  owner?:          string | null   // D
  tags?:           string[]        // C
  ashby_url?:      string | null   // E
  long_list_url?:  string | null   // E
  sub_dates?:      string[]        // F — index-aligned with sub_date_slots
  show_time?:      boolean         // H
}
```

---

## 6. Access control

| Field | viewer | editor | admin |
|-------|--------|--------|-------|
| `owner` (read) | ✓ | ✓ | ✓ |
| `owner` (write) | — | ✓ | ✓ |
| `tags` (read) | — | ✓ | ✓ |
| `tags` (write) | — | ✓ | ✓ |
| `ashby_url` / `long_list_url` (read) | — | ✓ | ✓ |
| `ashby_url` / `long_list_url` (write) | — | ✓ | ✓ |
| `sub_dates` (read) | ✓ | ✓ | ✓ |
| `show_time` (write) | — | ✓ | ✓ |

---

## 7. Files to change

| File | Change |
|------|--------|
| `supabase/migrations/20260611000000_events_v2.sql` | NEW — DB migration |
| `events/types/index.ts` | Add new fields to `CorporateEvent` + `EventConfig` |
| `app/api/events/route.ts` | Include new fields in SELECT + INSERT/UPDATE |
| `app/api/events/[id]/route.ts` | Include new fields in PUT handler |
| `app/api/events/config/route.ts` | Handle `notion_url`, `sub_date_slots`, `internal_tags` |
| `events/components/EventsPageClient.tsx` | Calendar rendering (A), owner display (D), sub-date markers (F), show_time (H), footer (B), links for managers (E) |
| `events/components/manager/edit-tab.tsx` | New fields in edit form: owner, tags, links, sub_dates, show_time toggle |
| `events/components/manager/settings-tab.tsx` | notion_url input, sub_date_slots inputs, internal_tags config |
| `events/components/manager/create-event-form.tsx` | Add new fields to create form |

---

## 8. Definition of Done

- [ ] Migration applied, `tsc --noEmit` = 0 errors, tests green
- [ ] Calendar shows start/end markers only (no continuous spans)
- [ ] `show_time=false` hides time everywhere in UI; toggle in edit form works
- [ ] Owner field saves and displays on event card for all users
- [ ] Tags visible only to editor/admin; preset + custom tags selectable
- [ ] Ashby + Long List links visible only to editor/admin with icons
- [ ] 3 sub-date slots configurable in Settings; dates shown as calendar markers
- [ ] Notion URL in footer (if set in Settings)
- [ ] GitHub issues created and closed with commit hashes
