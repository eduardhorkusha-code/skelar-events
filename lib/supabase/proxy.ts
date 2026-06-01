import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST use getUser(), never getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — always allow (API routes handle their own auth)
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')
  ) {
    return supabaseResponse
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // IMPORTANT: copy cookies to redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // External email (non-skelar.tech) — check DB approval status
  if (!user.email?.endsWith('@skelar.tech')) {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: profile } = await admin
      .from('profiles')
      .select('status, is_blocked')
      .eq('id', user.id)
      .single()

    if (profile?.is_blocked) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/blocked'
      return NextResponse.redirect(url)
    }

    if (profile?.status !== 'approved') {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending'
      return NextResponse.redirect(url)
    }

    // Approved external user — allow through
    return supabaseResponse
  }

  return supabaseResponse
}