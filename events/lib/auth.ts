import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/auth/roles'

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

  return {
    userId:  user.id,
    email:   user.email ?? '',
    name:    profile?.full_name ?? user.email ?? 'User',
    role:    profile?.role ?? 'user',
    isAdmin: adminAccess,
  }
}
