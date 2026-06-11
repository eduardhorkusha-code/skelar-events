import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdmin } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return { user, admin }
}

// GET /api/admin/users?status=pending
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = new URL(req.url).searchParams.get('status') || 'pending'
  const { data, error } = await ctx.admin
    .from('profiles')
    .select('id, email, full_name, status, role, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

// PATCH /api/admin/users — approve or block a user
export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, action } = await req.json() as { userId: string; action: 'approve' | 'block' | 'pending' | 'delete' }
  if (!userId || !['approve', 'block', 'pending', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const statusMap = { approve: 'approved', block: 'blocked', pending: 'pending', delete: 'deleted' }
  const { error } = await ctx.admin
    .from('profiles')
    .update({
      status: statusMap[action],
      is_blocked: action === 'block' || action === 'delete',
    })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
