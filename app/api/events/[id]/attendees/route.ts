import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, dashboards').eq('id', user.id).single()

  const canEdit =
    profile?.role === 'admin' ||
    profile?.role === 'manager'

  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.rpc('get_event_attendees', { p_event_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
