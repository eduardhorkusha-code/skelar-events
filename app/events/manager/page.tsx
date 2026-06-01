import { requireEventsAccess } from '../../../events/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ManagerClient } from '../../../events/components/ManagerClient'
import type { EventConfig, EventTypeConfig, TeamConfig } from '../../../events/types'
import { EVENT_TYPE_META, DOMAINS, LOCATIONS } from '../../../events/types'

export const metadata = { title: 'Events Manager — SKELAR Vault' }

export default async function ManagerPage() {
  const { isAdmin, name, role } = await requireEventsAccess()
  if (!isAdmin) redirect('/events')

  const supabase = await createClient()

  const [{ data: existing }, { data: configRows }] = await Promise.all([
    supabase
      .from('events_with_counts')
      .select('*')
      .order('start_at', { ascending: true }),
    supabase.from('event_config').select('id, values'),
  ])

  const cfgMap = Object.fromEntries((configRows ?? []).map(r => [r.id, r.values]))
  const config: EventConfig = {
    domains:     (cfgMap.domains     as string[]          | undefined) ?? [...DOMAINS],
    locations:   (cfgMap.locations   as string[]          | undefined) ?? [...LOCATIONS],
    event_types: (cfgMap.event_types as EventTypeConfig[] | undefined)
      ?? Object.entries(EVENT_TYPE_META).map(([key, m]) => ({ key, ...m })),
    teams:       (cfgMap.teams       as TeamConfig[]      | undefined) ?? [],
  }

  return (
    <ManagerClient
      existingEvents={(existing ?? []).map(e => ({
        ...e,
        going_count:      Number(e.going_count      ?? 0),
        interested_count: Number(e.interested_count ?? 0),
        capacity:         e.capacity != null ? Number(e.capacity) : null,
      }))}
      userName={name}
      userRole={role}
      config={config}
    />
  )
}
