/**
 * notify.ts — Slack notifications for event field changes.
 *
 * Called from PUT /api/events/[id] after a successful update.
 * Silently no-ops if SLACK_WEBHOOK_EVENTS is not set or the diff is empty.
 *
 * Env var: SLACK_WEBHOOK_EVENTS — Slack Incoming Webhook URL
 */

import type { CorporateEvent } from '@/events/types'

/** Fields monitored for change notifications */
const WATCHED_FIELDS: (keyof CorporateEvent)[] = [
  'title',
  'start_at',
  'end_at',
  'location',
  'status',
  'shortlist_date',
  'registration_deadline',
  'registration_url',
  'landing_url',
]

/** Human-readable label for each watched field */
const FIELD_LABELS: Partial<Record<keyof CorporateEvent, string>> = {
  title:                 'Title',
  start_at:              'Start',
  end_at:                'End',
  location:              'Location',
  status:                'Status',
  shortlist_date:        'Shortlist date',
  registration_deadline: 'Registration deadline',
  registration_url:      'Registration URL',
  landing_url:           'Landing URL',
}

type AnyEvent = Record<string, unknown>

/** Format a raw DB value for display in a Slack message */
function fmt(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'string') {
    // ISO datetime → readable date (strips time for brevity)
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return val.slice(0, 10)
  }
  return String(val)
}

/** Compute the diff of watched fields between oldRow and newRow */
function diffWatchedFields(
  oldRow: AnyEvent,
  newRow: AnyEvent,
): Array<{ field: string; from: string; to: string }> {
  const changes: Array<{ field: string; from: string; to: string }> = []

  for (const key of WATCHED_FIELDS) {
    const oldVal = oldRow[key]
    const newVal = newRow[key]
    if (newVal === undefined) continue           // field not in update payload — not changed
    if (String(oldVal ?? '') === String(newVal ?? '')) continue  // same value

    changes.push({
      field: FIELD_LABELS[key] ?? key,
      from:  fmt(oldVal),
      to:    fmt(newVal),
    })
  }

  return changes
}

/**
 * Send a Slack notification describing which fields changed on an event.
 *
 * @param oldRow   The event row BEFORE the update (select watched fields)
 * @param newRow   The event row AFTER the update (full row or update payload)
 * @param editorEmail  Email of the user who made the change (for attribution)
 */
export async function notifyEventChange(
  oldRow: AnyEvent,
  newRow: AnyEvent,
  editorEmail?: string | null,
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_EVENTS
  if (!webhookUrl) return  // env var not set — silently skip

  const changes = diffWatchedFields(oldRow, newRow)
  if (changes.length === 0) return  // nothing watched changed — skip

  const title   = String(newRow.title ?? oldRow.title ?? 'Unnamed event')
  const eventId = String(newRow.id   ?? oldRow.id   ?? '')

  // Build the change list text
  const changeLines = changes.map(c => `• *${c.field}:* ${c.from} → ${c.to}`)

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:calendar: *${title}* was updated${editorEmail ? ` by ${editorEmail}` : ''}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: changeLines.join('\n'),
      },
    },
  ]

  // Add "View event" button if landing_url is available
  const landingUrl = String(newRow.landing_url ?? oldRow.landing_url ?? '')
  const siteUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://events.skelar.tech'
  const viewUrl    = landingUrl || `${siteUrl}/events`

  blocks.push({
    type: 'actions',
    // @ts-expect-error — Slack Block Kit typing not in scope
    elements: [{
      type:  'button',
      text:  { type: 'plain_text', text: 'View event →' },
      url:   viewUrl,
      style: 'primary',
    }],
  })

  try {
    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ blocks }),
    })
  } catch (err) {
    // Never let a Slack failure break the PUT response
    console.warn('[notify] Slack webhook failed:', err)
  }
}
