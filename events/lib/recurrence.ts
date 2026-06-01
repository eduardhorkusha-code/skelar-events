import type { RecurrenceDayOfWeek, RecurrenceRule } from '../types'

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Returns the JS Date.getDay() index (0=Sun … 6=Sat) for a RecurrenceDayOfWeek */
const DOW_INDEX: Record<RecurrenceDayOfWeek, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** RFC 5545 BYDAY token for each RecurrenceDayOfWeek */
const DOW_RRULE: Record<RecurrenceDayOfWeek, string> = {
  Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA', Sun: 'SU',
}

/**
 * Add `n` months to `base`, clamping to the last day of the target month.
 * Always uses the UTC year/month/day of `base` as the anchor so that repeated
 * calls (month 0, 1, 2 …) always derive from the original day-of-month.
 */
function addMonthsClamped(base: Date, n: number): Date {
  const originYear  = base.getUTCFullYear()
  const originMonth = base.getUTCMonth()
  const originDay   = base.getUTCDate()
  const originHour  = base.getUTCHours()
  const originMin   = base.getUTCMinutes()
  const originSec   = base.getUTCSeconds()

  const targetYear  = originYear  + Math.floor((originMonth + n) / 12)
  const targetMonth = ((originMonth + n) % 12 + 12) % 12

  // Last day of the target month (UTC)
  const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const clampedDay = Math.min(originDay, maxDay)

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, originHour, originMin, originSec))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate all occurrence start-times for a recurring event.
 *
 * @param startAt      ISO string of the template's start_at
 * @param rule         RecurrenceRule from the template
 * @param horizonDays  Max days ahead to generate (default 365)
 * @returns Array of Date objects for each occurrence start time (including the first)
 */
export function generateOccurrences(
  startAt: string,
  rule: RecurrenceRule,
  horizonDays = 365,
): Date[] {
  const origin = new Date(startAt)
  const horizon = new Date(origin)
  horizon.setDate(horizon.getDate() + horizonDays)

  const untilDate = rule.end_type === 'date' && rule.until
    ? new Date(rule.until + 'T23:59:59Z')
    : null

  const maxCount = rule.end_type === 'count' && rule.count != null
    ? rule.count
    : Infinity

  const results: Date[] = []

  if (rule.frequency === 'monthly') {
    let monthsAdded = 0
    while (results.length < maxCount) {
      const occurrence = addMonthsClamped(origin, monthsAdded)
      if (occurrence > horizon) break
      if (untilDate && occurrence > untilDate) break
      results.push(occurrence)
      monthsAdded++
    }
    return results
  }

  // daily / weekly / biweekly
  const stepDays = rule.frequency === 'daily' ? 1
    : rule.frequency === 'biweekly' ? 14
    : 7 // weekly

  const dowFilter = (rule.frequency === 'weekly' || rule.frequency === 'biweekly')
    && rule.days_of_week && rule.days_of_week.length > 0
    ? new Set(rule.days_of_week.map(d => DOW_INDEX[d]))
    : null

  if (dowFilter !== null) {
    // Expand: iterate day-by-day within each week/two-week window,
    // only emit days matching the filter.
    const windowDays = stepDays // 7 or 14
    let windowStart = new Date(origin)

    while (results.length < maxCount) {
      // Collect matching days within this window
      for (let offset = 0; offset < windowDays; offset++) {
        const candidate = new Date(windowStart)
        candidate.setDate(candidate.getDate() + offset)

        if (candidate > horizon) return results
        if (untilDate && candidate > untilDate) return results
        if (results.length >= maxCount) return results

        if (dowFilter.has(candidate.getDay())) {
          results.push(candidate)
        }
      }
      // Advance to next window
      windowStart = new Date(windowStart)
      windowStart.setDate(windowStart.getDate() + windowDays)
    }
  } else {
    // Simple step: no day-of-week filter (daily, or weekly/biweekly without days_of_week)
    let current = new Date(origin)
    while (results.length < maxCount) {
      if (current > horizon) break
      if (untilDate && current > untilDate) break
      results.push(new Date(current))
      current.setDate(current.getDate() + stepDays)
    }
  }

  return results
}

/**
 * Convert a RecurrenceRule to a human-readable label.
 * Examples:
 *   "Repeats daily · 10 times"
 *   "Repeats weekly on Mon, Wed · until 2026-12-31"
 *   "Repeats monthly · forever"
 */
export function recurrenceLabel(rule: RecurrenceRule): string {
  const freqLabel: Record<RecurrenceRule['frequency'], string> = {
    daily:    'daily',
    weekly:   'weekly',
    biweekly: 'every two weeks',
    monthly:  'monthly',
  }

  let label = `Repeats ${freqLabel[rule.frequency]}`

  if (
    (rule.frequency === 'weekly' || rule.frequency === 'biweekly') &&
    rule.days_of_week &&
    rule.days_of_week.length > 0
  ) {
    label += ` on ${rule.days_of_week.join(', ')}`
  }

  if (rule.end_type === 'count' && rule.count != null) {
    label += ` · ${rule.count} time${rule.count === 1 ? '' : 's'}`
  } else if (rule.end_type === 'date' && rule.until) {
    label += ` · until ${rule.until}`
  } else {
    label += ' · forever'
  }

  return label
}

/**
 * Convert a RecurrenceRule to an RFC 5545 RRULE string for ICS files.
 * Examples:
 *   "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10"
 *   "RRULE:FREQ=MONTHLY;UNTIL=20261231T000000Z"
 */
export function toRRule(rule: RecurrenceRule): string {
  const freqMap: Record<RecurrenceRule['frequency'], string> = {
    daily:    'DAILY',
    weekly:   'WEEKLY',
    biweekly: 'WEEKLY',
    monthly:  'MONTHLY',
  }

  const parts: string[] = [`FREQ=${freqMap[rule.frequency]}`]

  if (rule.frequency === 'biweekly') {
    parts.push('INTERVAL=2')
  }

  if (
    (rule.frequency === 'weekly' || rule.frequency === 'biweekly') &&
    rule.days_of_week &&
    rule.days_of_week.length > 0
  ) {
    parts.push(`BYDAY=${rule.days_of_week.map(d => DOW_RRULE[d]).join(',')}`)
  }

  if (rule.end_type === 'count' && rule.count != null) {
    parts.push(`COUNT=${rule.count}`)
  } else if (rule.end_type === 'date' && rule.until) {
    // UNTIL must be in UTC compact format: YYYYMMDDTHHMMSSZ
    const compact = rule.until.replace(/-/g, '') + 'T000000Z'
    parts.push(`UNTIL=${compact}`)
  }

  return `RRULE:${parts.join(';')}`
}
