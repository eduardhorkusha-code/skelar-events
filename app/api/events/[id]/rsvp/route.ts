import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json() as { status: string | null }

  if (status === null) {
    // Remove RSVP
    await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', user.id)
  } else {
    // Upsert RSVP
    const { error } = await supabase.from('event_rsvps').upsert({
      event_id: id, user_id: user.id, status,
    }, { onConflict: 'event_id,user_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return updated event with fresh counts
  const { data: ev } = await supabase
    .from('events_with_counts')
    .select('*')
    .eq('id', id)
    .single()

  const { data: myRsvp } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    ...ev,
    going_count:      Number(ev?.going_count ?? 0),
    interested_count: Number(ev?.interested_count ?? 0),
    my_rsvp:          myRsvp?.status ?? null,
  })
}
