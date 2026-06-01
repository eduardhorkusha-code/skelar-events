import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') ?? '/events'
  // L3: open redirect guard — only allow relative paths that don't start with //
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/events'

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[callback] error:', error.message)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const admin = createAdmin()

  // Ensure profile row exists
  const { error: profileUpsertError } = await admin.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      role: 'user',
      status: 'pending',
      dashboards: [],
      brands: [],
      is_blocked: false,
      globally_blocked: false,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (profileUpsertError) {
    console.error('[callback] failed to upsert profile:', profileUpsertError.message)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Global block check
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('globally_blocked')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[callback] profile query failed:', profileError.message)
    return NextResponse.redirect(new URL('/auth/error?reason=db_error', request.url))
  }

  if (profile?.globally_blocked) {
    return NextResponse.redirect(new URL('/auth/blocked', request.url))
  }

  // Check user_roles for scope "events"
  const { data: existing, error: rolesError } = await admin
    .from('user_roles')
    .select('status')
    .eq('user_id', user.id)
    .eq('scope', 'events')
    .single()

  // PGRST116 = no rows = new user, not an error
  if (rolesError && rolesError.code !== 'PGRST116') {
    console.error('[callback] user_roles query failed:', rolesError.message)
    return NextResponse.redirect(new URL('/auth/error?reason=db_error', request.url))
  }

  if (existing) {
    if (existing.status === 'blocked') return NextResponse.redirect(new URL('/auth/blocked', request.url))
    if (existing.status === 'pending') return NextResponse.redirect(new URL('/auth/pending', request.url))
    return NextResponse.redirect(new URL(next, request.url))
  }

  // New user — check product_config for auto_approve_domains
  const { data: config } = await admin
    .from('product_config')
    .select('auto_approve_domains, default_role')
    .eq('scope', 'events')
    .single()

  // H4: never auto-approve unverified emails
  if (!user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/auth/pending', request.url))
  }

  const domain = user.email?.split('@')[1]?.toLowerCase() ?? ''
  const autoApprove =
    Array.isArray(config?.auto_approve_domains) &&
    config.auto_approve_domains.map((d: string) => d.toLowerCase()).includes(domain)

  const { error: roleError } = await admin.from('user_roles').upsert(
    {
      user_id: user.id,
      scope: 'events',
      role: config?.default_role ?? 'viewer',
      status: autoApprove ? 'active' : 'pending',
    },
    { onConflict: 'user_id,scope', ignoreDuplicates: true }
  )

  if (roleError) {
    console.error('[callback] failed to upsert user_roles:', roleError.message)
    return NextResponse.redirect(new URL('/auth/error?reason=db_error', request.url))
  }

  if (!autoApprove) return NextResponse.redirect(new URL('/auth/pending', request.url))
  return NextResponse.redirect(new URL(next, request.url))
}
