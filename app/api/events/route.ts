import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateOccurrences } from '@/events/lib/recurrence'
import type { RecurrenceRule } from '@/events/types'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events_with_counts')
    .select('*')
    .neq('status', 'deleted')
    .order('start_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, dashboards').eq('id', user.id).single()

  const canEdit =
    profile?.role === 'admin' ||
    (profile?.role === 'manager' && (profile?.dashboards ?? []).includes('events'))

  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  // Phase 4: if recurrence_rule is present — create template + instances
  if (body.recurrence_rule) {
    const rule: RecurrenceRule = body.recurrence_rule
    const occurrences = generateOccurrences(body.start_at, rule)

    if (occurrences.length === 0) {
      return NextResponse.json({ error: 'recurrence_rule produced no occurrences' }, { status: 422 })
    }

    const durationMs =
      new Date(body.end_at).getTime() - new Date(body.start_at).getTime()

    // Strip recurrence relationship fields from the user-supplied body
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { recurrence_rule: _rule, recurrence_id: _rid, recurrence_index: _ridx, ...baseFields } = body

    // Insert template: holds recurrence_rule, recurrence_id = null, recurrence_index = null
    const templateRow = {
      ...baseFields,
      start_at: occurrences[0].toISOString(),
      end_at: new Date(occurrences[0].getTime() + durationMs).toISOString(),
      recurrence_rule: rule,
      recurrence_id: null,
      recurrence_index: null,
      created_by: user.id,
    }

    const { data: template, error: tplErr } = await supabase
      .from('corporate_events')
      .insert(templateRow)
      .select()
      .single()

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 })

    // Build instance rows (occurrences[1..]) — index 0 = first instance after template
    if (occurrences.length > 1) {
      const instanceRows = occurrences.slice(1).map((occ, i) => ({
        ...baseFields,
        start_at: occ.toISOString(),
        end_at: new Date(occ.getTime() + durationMs).toISOString(),
        recurrence_rule: null,
        recurrence_id: template.id as string,
        recurrence_index: i,
        created_by: user.id,
      }))

      const { error: instErr } = await supabase
        .from('corporate_events')
        .insert(instanceRows)

      if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 })
    }

    return NextResponse.json(
      { ...template, going_count: 0, interested_count: 0, my_rsvp: null },
      { status: 201 },
    )
  }

  // Non-recurring event — original behaviour
  const { data, error } = await supabase
    .from('corporate_events')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, going_count: 0, interested_count: 0, my_rsvp: null }, { status: 201 })
}
