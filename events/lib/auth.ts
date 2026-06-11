import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth/roles'
import { adminLog } from '@/lib/admin-log'

export async function requireEventsAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // isAdmin = at least 'editor' in 'events' or 'global' scope (user_roles table)
  const adminAccess = await hasRole(user.id, 'editor')

  if (!adminAccess) {
    // Check if they have ANY events role (viewer) — if not, they may have just signed up
    const viewerAccess = await hasRole(user.id, 'viewer')
    if (!viewerAccess) {
      await adminLog({
        level: 'warn',
        scope: 'auth',
        userId: user.id,
        userEmail: user.email,
        message: 'User has no events role — possible first-login race condition',
        metadata: { profileRole: profile?.role ?? null },
      })
    }
  }

  return {
    userId:  user.id,
    email:   user.email ?? '',
    name:    profile?.full_name ?? user.email ?? 'User',
    role:    profile?.role ?? 'user',
    isAdmin: adminAccess,
  }
}
