import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RecurrenceRule } from '@/events/types'
import { toRRule } from '@/events/lib/recurrence'

function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ev, error } = await supabase
    .from('corporate_events').select('*').eq('id', id).single()

  if (error || !ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SKELAR//Vault Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@skelar.tech`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(ev.start_at)}`,
    `DTEND:${toIcsDate(ev.end_at)}`,
    ev.recurrence_rule ? toRRule(ev.recurrence_rule as RecurrenceRule) : '',
    `SUMMARY:${escapeIcs(ev.title)}`,
    ev.description ? `DESCRIPTION:${escapeIcs(ev.description)}` : '',
    ev.location ? `LOCATION:${escapeIcs(ev.location)}` : '',
    ev.location_url ? `URL:${ev.location_url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const filename = encodeURIComponent(ev.title.replace(/[^a-z0-9]/gi, '-')) + '.ics'

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
