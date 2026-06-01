import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json() as { url: string }
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 422 })

    const html = await res.text()

    // Try JSON-LD structured data first
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    const events: unknown[] = []

    for (const match of jsonLdMatches) {
      try {
        const json = JSON.parse(match[1])
        const items = Array.isArray(json) ? json : [json]
        for (const item of items) {
          if (item['@type'] === 'Event') {
            events.push({
              title: item.name ?? '',
              description: item.description ?? null,
              location: typeof item.location === 'string'
                ? item.location
                : item.location?.name ?? null,
              start_at: item.startDate ?? null,
              end_at: item.endDate ?? item.startDate ?? null,
              url: item.url ?? url,
            })
          }
        }
      } catch { /* skip malformed JSON-LD */ }
    }

    // Fallback: extract <title> and meta description for context
    const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
    const metaDesc  = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] ?? ''

    return NextResponse.json({
      events,
      meta: { url, pageTitle, metaDesc, foundCount: events.length },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 422 })
  }
}
