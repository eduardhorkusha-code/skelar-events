import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasRole } from '@/lib/auth/roles'
import { createClient as createUserClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ok = await hasRole(user.id, 'admin')
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data, error } = await svc
    .from('admin_logs')
    .select('id, created_at, level, scope, user_email, message, metadata')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}
