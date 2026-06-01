import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check profile status before allowing in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdmin()
        const { data: profile } = await admin
          .from('profiles')
          .select('is_blocked')
          .eq('id', user.id)
          .single()

        if (profile?.is_blocked) {
          return NextResponse.redirect(new URL('/auth/blocked', request.url))
        }
        if (!profile) {
          // No profile row — create a pending account so admin can approve
          const { error: insertError } = await admin.from('profiles').insert({
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
            role: 'user',
            status: 'pending',
            dashboards: [],
            brands: [],
            is_blocked: false,
          })
          if (insertError) {
            console.error('[callback] failed to create pending profile:', insertError.message, insertError.details)
          }
          return NextResponse.redirect(new URL('/auth/pending', request.url))
        }
      }
      return NextResponse.redirect(new URL(next, request.url))
    }
    console.error('[callback] error:', error.message)
  }

  return NextResponse.redirect(new URL('/login', request.url))
}