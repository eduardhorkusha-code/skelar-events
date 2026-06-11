import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function adminLog(opts: {
  level: 'info' | 'warn' | 'error'
  scope: string
  userId?: string
  userEmail?: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = getServiceClient()
    await supabase.from('admin_logs').insert({
      level:      opts.level,
      scope:      opts.scope,
      user_id:    opts.userId ?? null,
      user_email: opts.userEmail ?? null,
      message:    opts.message,
      metadata:   opts.metadata ?? null,
    })
  } catch (err) {
    console.error('[adminLog] failed to write log:', err)
  }
}
