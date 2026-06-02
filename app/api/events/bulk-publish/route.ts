import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canEdit as hasEditRole } from '@/lib/auth/roles'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await hasEditRole(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids, publish_at } = await req.json() as { ids: string[]; publish_at?: string }

  if (!ids?.length) return NextResponse.json({ error: 'No event IDs provided' }, { status: 400 })

  if (publish_at) {
    // Schedule: set publish_at, keep as draft
    const { error } = await supabase
      .from('corporate_events')
      .update({ publish_at, updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ scheduled: ids.length })
  } else {
    // Publish now
    const { error } = await supabase
      .from('corporate_events')
      .update({ status: 'published', publish_at: null, updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ published: ids.length })
  }
}
