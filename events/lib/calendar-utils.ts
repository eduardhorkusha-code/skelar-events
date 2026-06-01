import type { CorporateEvent } from '../types'

// Returns 28, 35, or 42 cells (4–6 weeks × 7 days) starting from Monday.
// Only as many rows as needed — no trailing "gray" row of next month.
export function getCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  // Monday=0 offset
  let startDow = firstOfMonth.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: Date[] = []
  for (let i = startDow; i > 0; i--) days.push(new Date(year, month, 1 - i))
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d++) days.push(new Date(year, month, d))
  // Fill to the end of the current week only (multiple of 7), not a full 6th row
  while (days.length % 7 !== 0) days.push(new Date(year, month + 1, days.length - lastDay - startDow + 1))
  return days
}

/** Local-time date string — used for "today" highlight only */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** UTC date string — used for mapping ISO timestamps to calendar days */
export function isoDateUTC(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export type CalendarEntry = {
  event:     CorporateEvent
  isEnd:     boolean   // last day of the event
  isOngoing: boolean   // event spans through this month (no start or end here)
}

/**
 * Maps each event to calendar days:
 *  - start day → isEnd=false, isOngoing=false
 *  - end day   → isEnd=true,  isOngoing=false  (if different from start)
 *  - first day of current month → isOngoing=true  (started before + ends after)
 *
 * Uses UTC dates to avoid timezone-shift bugs.
 * Pass `monthFirstDay` (ISO string of the 1st of the displayed month) to
 * enable the ongoing-event anchor.
 */
export function eventsByDay(
  events: CorporateEvent[],
  monthFirstDay?: string,
): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>()

  for (const e of events) {
    const startDay = isoDateUTC(e.start_at)
    const endDay   = isoDateUTC(e.end_at)

    // Start chip
    const startArr = map.get(startDay) ?? []
    startArr.push({ event: e, isEnd: false, isOngoing: false })
    map.set(startDay, startArr)

    if (endDay !== startDay) {
      // End chip
      const endArr = map.get(endDay) ?? []
      endArr.push({ event: e, isEnd: true, isOngoing: false })
      map.set(endDay, endArr)

      // Ongoing anchor: event spans THROUGH the current month
      // (started before the 1st, ends after the 1st but not on the 1st)
      if (
        monthFirstDay &&
        startDay < monthFirstDay &&
        endDay > monthFirstDay
      ) {
        const ongoingArr = map.get(monthFirstDay) ?? []
        // Avoid duplicate if start already lands on monthFirstDay
        if (!ongoingArr.some(x => x.event.id === e.id)) {
          ongoingArr.push({ event: e, isEnd: false, isOngoing: true })
          map.set(monthFirstDay, ongoingArr)
        }
      }
    }
  }

  return map
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function googleCalendarUrl(ev: CorporateEvent) {
  const fmt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${fmt(ev.start_at)}/${fmt(ev.end_at)}`,
    details: ev.description ?? '',
    location: ev.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

export function outlookCalendarUrl(ev: CorporateEvent) {
  const p = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: ev.start_at,
    enddt: ev.end_at,
    subject: ev.title,
    body: ev.description ?? '',
    location: ev.location ?? '',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`
}

export function MONTHS_UK() {
  return ['Січень','Лютий','Березень','Квітень','Травень','Червень',
          'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']
}
export const DAYS_UK = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']

export function MONTHS_EN() {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December']
}
export const DAYS_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
