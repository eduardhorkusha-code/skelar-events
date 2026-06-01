# skelar-events

SKELAR Events & Calendar platform.

- **Production:** https://events.skelar.tech
- **Mirror:** https://skelar-events.vercel.app
- **Source:** Extracted from skelar-vault

## Stack
- Next.js 14, TypeScript strict
- Supabase (shared with skelar-vault)
- Vercel deployment

## Auth
Google OAuth with domain-based auto-approval.
Set APPROTED_DOMAINS=skelar.tech,gen.tech in env vars (comma-separated, no @).

## Env Vars (copy from skelar-vault to new Vercel project)
| Variable | Required | Notes |
|----------|----------|-------|
| `NEOT_PUBLIC_SUPABASE_URL` | yes | Same project as skelar-vault |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Same project as skelar-vault |
| SUPABASE_SERVICE_ROLE_KEY | yes | Server-only |
| `NEXT_PUBLIC_APP_URL` | yes | https://events.skelar.tech |
| APPROTED_DOMAINS | yes | skelar.tech,gen.tech |
| `SLACK_WEBHOOK_EVENTS` | optional | Event field change alerts |
