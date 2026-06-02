import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canEdit as hasEditRole } from '@/lib/auth/roles'

export const revalidate = 0

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_config')
    .select('id, values')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map: Record<string, unknown[]> = {}
  for (const row of data ?? []) map[row.id] = row.values
  return NextResponse.json(map)
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await hasEditRole(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Record<string, unknown[]>

  const upserts = Object.entries(body).map(([id, values]) => ({
    id,
    values,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('event_config').upsert(upserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
