import { requireEventsAccess } from '../../events/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EventsPageClient } from '../../events/components/EventsPageClient'
import type { CorporateEvent, EventConfig, EventTypeConfig, TeamConfig } from '../../events/types'
import { EVENT_TYPE_META, DOMAINS, LOCATIONS, DEFAULT_SUB_DATE_SLOTS, DEFAULT_INTERNAL_TAGS } from '../../events/types'

export const metadata = {
  title: 'Events — SKELAR Vault',
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const previewMode = sp.preview === '1'
  const { userId, name, role, isAdmin: _isAdmin } = await requireEventsAccess()
  const isAdmin = _isAdmin && !previewMode
  const supabase = await createClient()

  const [{ data: eventsRaw }, { data: myRsvps }, { data: configRows }] = await Promise.all([
    supabase.from('events_with_counts').select('*').neq('status', 'deleted').order('start_at', { ascending: true }),
    supabase.from('event_rsvps').select('event_id, status').eq('user_id', userId),
    supabase.from('event_config').select('id, values'),
  ])

  const myRsvpMap = new Map((myRsvps ?? []).map(r => [r.event_id, r.status]))

  const events: CorporateEvent[] = (eventsRaw ?? []).map(e => ({
    ...e,
    going_count:      Number(e.going_count ?? 0),
    interested_count: Number(e.interested_count ?? 0),
    my_rsvp:          myRsvpMap.get(e.id) ?? null,
  }))

  const cfgMap = Object.fromEntries((configRows ?? []).map(r => [r.id, r.values]))
  const config: EventConfig = {
    domains:       (cfgMap.domains     as string[]          | undefined) ?? [...DOMAINS],
    locations:     (cfgMap.locations   as string[]          | undefined) ?? [...LOCATIONS],
    event_types:   (cfgMap.event_types as EventTypeConfig[] | undefined)
      ?? Object.entries(EVENT_TYPE_META).map(([key, m]) => ({ key, ...m })),
    teams:         (cfgMap.teams       as TeamConfig[]      | undefined) ?? [],
    contact_email: (cfgMap.contact_email as string[] | undefined)?.[0] ?? undefined,
    notion_url:     (cfgMap.notion_url     as string[] | undefined)?.[0] ?? undefined,
    sub_date_slots: (cfgMap.sub_date_slots as [string, string, string] | undefined) ?? DEFAULT_SUB_DATE_SLOTS,
    internal_tags:  (cfgMap.internal_tags  as string[] | undefined) ?? DEFAULT_INTERNAL_TAGS,
  }

  return (
    <EventsPageClient
      events={events}
      userId={userId}
      name={name}
      role={role}
      isAdmin={isAdmin}
      config={config}
      previewMode={previewMode}
    />
  )
}
