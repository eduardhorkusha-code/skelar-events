import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireEventsAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, dashboards')
    .eq('id', user.id)
    .single()

  const role       = profile?.role ?? 'user'
  const dashboards = (profile?.dashboards ?? []) as string[]

  // Admin: full control
  // Manager (any): can access the events manager
  // Everyone else: view only
  const canEdit =
    role === 'admin' ||
    role === 'manager'

  return {
    userId:  user.id,
    email:   user.email ?? '',
    name:    profile?.full_name ?? user.email ?? 'User',
    role,
    isAdmin: canEdit,
  }
}
