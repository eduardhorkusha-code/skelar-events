import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdmin } from '@/lib/supabase/server'
import { generateOccurrences } from '@/events/lib/recurrence'
import { notifyEventChange } from '@/events/lib/notify'
import { canEdit as hasEditRole } from '@/lib/auth/roles'
import type { RecurrenceEditMode, RecurrenceRule } from '@/events/types'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (!(await hasEditRole(user.id))) return null
  return user
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Use service-role client for writes — RLS on corporate_events checks profiles.role
  // (legacy) but skelar-events auth uses user_roles, so user-client updates are blocked.
  const admin = createAdmin()

  const editMode: RecurrenceEditMode =
    (req.nextUrl.searchParams.get('edit_mode') as RecurrenceEditMode | null) ?? 'this'

  const body = await req.json()
  const now = new Date().toISOString()

  if (editMode === 'this') {
    // Fetch old row for change diffing BEFORE the update.
    // Use select('*') so the query doesn't fail if optional columns
    // (shortlist_date, registration_deadline) haven't been migrated yet.
    const { data: oldRow, error: oldRowErr } = await admin
      .from('corporate_events')
      .select('*')
      .eq('id', id)
      .single()

    if (oldRowErr) {
      console.warn('[events/PUT] could not fetch old row for diff:', oldRowErr.message)
    }

    // Simple single-event update — original behaviour
    const { data, error } = await admin
      .from('corporate_events')
      .update({ ...body, updated_at: now })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire Slack notification (non-blocking — never fails the request)
    if (oldRow) {
      notifyEventChange(oldRow, { ...oldRow, ...body }, user.email ?? null)
        .catch(err => console.error('[events/PUT] notifyEventChange failed:', err))
    } else {
      console.warn('[events/PUT] skipping notification — oldRow was null')
    }

    const { data: counts } = await supabase
      .from('events_with_counts')
      .select('going_count, interested_count')
      .eq('id', id)
      .single()

    const { data: myRsvp } = await supabase
      .from('event_rsvps')
      .select('status')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      ...data,
      going_count:      Number(counts?.going_count ?? 0),
      interested_count: Number(counts?.interested_count ?? 0),
      my_rsvp:          myRsvp?.status ?? null,
    })
  }

  // For this_and_following / all we need the current event row first
  const { data: currentEvent, error: fetchErr } = await supabase
    .from('corporate_events')
    .select('recurrence_id, recurrence_index, recurrence_rule, start_at, end_at')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Resolve the series template id and the index of the event being edited
  const seriesId: string = currentEvent.recurrence_id ?? id
  const currentIndex: number = currentEvent.recurrence_index ?? 0

  const startAtChanged = body.start_at !== undefined && body.start_at !== currentEvent.start_at
  const ruleChanged    = body.recurrence_rule !== undefined

  if (editMode === 'this_and_following') {
    // Update the event itself + all following instances
    const updatePayload = { ...body, updated_at: now }

    const { error: selfErr } = await admin
      .from('corporate_events')
      .update(updatePayload)
      .eq('id', id)

    if (selfErr) return NextResponse.json({ error: selfErr.message }, { status: 500 })

    const { error: followErr } = await admin
      .from('corporate_events')
      .update(updatePayload)
      .eq('recurrence_id', seriesId)
      .gte('recurrence_index', currentIndex)

    if (followErr) return NextResponse.json({ error: followErr.message }, { status: 500 })

    // If start_at or recurrence_rule changed, regenerate future instances
    if (startAtChanged || ruleChanged) {
      // Soft-delete old instances after currentIndex
      const { error: delErr } = await supabase
        .from('corporate_events')
        .update({ status: 'deleted', updated_at: now })
        .eq('recurrence_id', seriesId)
        .gt('recurrence_index', currentIndex)

      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

      // Resolve rule and duration from updated values or fall back to current
      const rule: RecurrenceRule =
        body.recurrence_rule ?? currentEvent.recurrence_rule as RecurrenceRule

      if (rule) {
        const newStartAt: string = body.start_at ?? currentEvent.start_at
        const newEndAt: string   = body.end_at   ?? currentEvent.end_at
        const durationMs = new Date(newEndAt).getTime() - new Date(newStartAt).getTime()

        const occurrences = generateOccurrences(newStartAt, rule)
        // occurrences[0] = the event itself (already updated above), skip it
        const futureOccurrences = occurrences.slice(1)

        if (futureOccurrences.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { recurrence_rule: _r, recurrence_id: _ri, recurrence_index: _rix, start_at: _s, end_at: _e, updated_at: _u, ...sharedFields } = updatePayload

          const newInstances = futureOccurrences.map((occ, i) => ({
            ...sharedFields,
            start_at: occ.toISOString(),
            end_at: new Date(occ.getTime() + durationMs).toISOString(),
            recurrence_rule: null,
            recurrence_id: seriesId,
            recurrence_index: currentIndex + 1 + i,
            status: 'published',
          }))

          const { error: insertErr } = await supabase
            .from('corporate_events')
            .insert(newInstances)

          if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
        }
      }
    }
  } else {
    // editMode === 'all': update template + all instances
    const updatePayload = { ...body, updated_at: now }

    // Update the template (recurrence_rule lives here)
    const { error: tplErr } = await admin
      .from('corporate_events')
      .update(updatePayload)
      .eq('id', seriesId)

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 })

    // Update all instances
    const { error: instErr } = await admin
      .from('corporate_events')
      .update(updatePayload)
      .eq('recurrence_id', seriesId)

    if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 })

    // Regenerate instances if start_at or recurrence_rule changed
    if (startAtChanged || ruleChanged) {
      // Soft-delete all existing instances
      const { error: delErr } = await supabase
        .from('corporate_events')
        .update({ status: 'deleted', updated_at: now })
        .eq('recurrence_id', seriesId)

      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

      // Get the template's final start_at to regenerate from
      const { data: template, error: tplFetchErr } = await supabase
        .from('corporate_events')
        .select('start_at, end_at, recurrence_rule')
        .eq('id', seriesId)
        .single()

      if (tplFetchErr) return NextResponse.json({ error: tplFetchErr.message }, { status: 500 })

      const rule: RecurrenceRule = body.recurrence_rule ?? template.recurrence_rule as RecurrenceRule

      if (rule) {
        const templateStartAt: string = body.start_at ?? template.start_at
        const templateEndAt: string   = body.end_at   ?? template.end_at
        const durationMs = new Date(templateEndAt).getTime() - new Date(templateStartAt).getTime()

        const occurrences = generateOccurrences(templateStartAt, rule)
        // occurrences[0] = template itself, skip
        const instanceOccurrences = occurrences.slice(1)

        if (instanceOccurrences.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { recurrence_rule: _r, recurrence_id: _ri, recurrence_index: _rix, start_at: _s, end_at: _e, updated_at: _u, ...sharedFields } = updatePayload

          const newInstances = instanceOccurrences.map((occ, i) => ({
            ...sharedFields,
            start_at: occ.toISOString(),
            end_at: new Date(occ.getTime() + durationMs).toISOString(),
            recurrence_rule: null,
            recurrence_id: seriesId,
            recurrence_index: i,
            status: 'published',
          }))

          const { error: insertErr } = await supabase
            .from('corporate_events')
            .insert(newInstances)

          if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
        }
      }
    }
  }

  // Return the updated event with counts
  const { data: updated } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('id', id)
    .single()

  return NextResponse.json(updated ?? { ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdmin()

  const editMode: RecurrenceEditMode =
    (req.nextUrl.searchParams.get('edit_mode') as RecurrenceEditMode | null) ?? 'this'

  const now = new Date().toISOString()

  if (editMode === 'this') {
    // Original behaviour — soft-delete single event
    const { error } = await admin
      .from('corporate_events')
      .update({ status: 'deleted', updated_at: now })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Need the current event to resolve series context
  const { data: currentEvent, error: fetchErr } = await admin
    .from('corporate_events')
    .select('recurrence_id, recurrence_index')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const seriesId: string = currentEvent.recurrence_id ?? id
  const currentIndex: number = currentEvent.recurrence_index ?? 0

  if (editMode === 'this_and_following') {
    // Soft-delete this event
    const { error: selfErr } = await admin
      .from('corporate_events')
      .update({ status: 'deleted', updated_at: now })
      .eq('id', id)

    if (selfErr) return NextResponse.json({ error: selfErr.message }, { status: 500 })

    // Soft-delete all following instances
    const { error: followErr } = await admin
      .from('corporate_events')
      .update({ status: 'deleted', updated_at: now })
      .eq('recurrence_id', seriesId)
      .gte('recurrence_index', currentIndex)

    if (followErr) return NextResponse.json({ error: followErr.message }, { status: 500 })
  } else {
    // editMode === 'all': soft-delete template + all instances
    const { error: tplErr } = await admin
      .from('corporate_events')
      .update({ status: 'deleted', updated_at: now })
      .eq('id', seriesId)

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 })

    const { error: instErr } = await admin
      .from('corporate_events')
      .update({ status: 'deleted', updated_at: now })
      .eq('recurrence_id', seriesId)

    if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
