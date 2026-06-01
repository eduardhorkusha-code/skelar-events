import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdmin } from '@/lib/supabase/server'

/**
 * Check if an email domain is in the APPROVED_DOMAINS env var.
 * APPROVED_DOMAINS = comma-separated list of domains without @, e.g. "skelar.tech,gen.tech"
 * Defaults to "skelar.tech" if not set.
 */
function isApprovedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  const approved = (process.env.APPROVED_DOMAINS || 'skelar.tech')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean)
  return approved.includes(domain)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/events'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdmin()
        const { data: profile } = await admin
          .from('profiles')
          .select('status, is_blocked, role')
          .eq('id', user.id)
          .single()

        // Blocked → always redirect to blocked page
        if (profile?.is_blocked) {
          return NextResponse.redirect(new URL('/auth/blocked', request.url))
        }

        if (!profile) {
          // New user — auto-approve if domain matches, otherwise pending
          const autoApproved = isApprovedDomain(user.email ?? '')
          const { error: insertError } = await admin.from('profiles').insert({
            id: user.id,
            email: user.email ?? '',
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
            role: 'viewer',
            status: autoApproved ? 'approved' : 'pending',
            dashboards: [],
            brands: [],
            is_blocked: false,
          })
          if (insertError) {
            console.error('[callback] failed to create profile:', insertError.message)
          }
          if (!autoApproved) {
            return NextResponse.redirect(new URL('/auth/pending', request.url))
          }
          return NextResponse.redirect(new URL(next, request.url))
        }

        // Existing user — respect current status
        if (profile.status === 'pending') {
          return NextResponse.redirect(new URL('/auth/pending', request.url))
        }
        if (profile.status === 'blocked') {
          return NextResponse.redirect(new URL('/auth/blocked', request.url))
        }
      }
      return NextResponse.redirect(new URL(next, request.url))
    }
    console.error('[callback] error:', error.message)
  }

  return NextResponse.redirect(new URL('/login', request.url))
}