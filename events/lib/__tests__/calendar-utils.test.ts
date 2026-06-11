import { describe, it, expect } from 'vitest'
import { eventsByDay, subDatesByDay } from '../calendar-utils'
import type { CorporateEvent } from '../../types'

const base: CorporateEvent = {
  id: '1', title: 'Test', description: null,
  start_at: '2026-06-10T10:00:00Z', end_at: '2026-06-12T10:00:00Z',
  location: null, location_url: null, event_type: 'event',
  organization: null, domain: null, participants_url: null,
  team_members: null, capacity: null, cover_emoji: null, cover_color: null,
  status: 'published', created_by: null, created_at: '', updated_at: '',
  going_count: 0, interested_count: 0, my_rsvp: null,
}

describe('eventsByDay', () => {
  it('shows start and end chips only — no ongoing anchor', () => {
    const monthFirst = '2026-07-01'
    // Event ends July 5 but started June 10 — should NOT appear as ongoing on July 1
    const ev = { ...base, start_at: '2026-06-10T10:00:00Z', end_at: '2026-07-05T10:00:00Z' }
    const map = eventsByDay([ev], monthFirst)
    const july1 = map.get('2026-07-01')
    expect(july1?.some(e => e.isOngoing)).toBeFalsy()
  })

  it('maps start and end to correct days', () => {
    const map = eventsByDay([base])
    expect(map.get('2026-06-10')?.[0].isEnd).toBe(false)
    expect(map.get('2026-06-12')?.[0].isEnd).toBe(true)
  })
})

describe('subDatesByDay', () => {
  it('maps sub_dates to correct days with slot labels', () => {
    const ev = { ...base, sub_dates: ['2026-06-15', '', '2026-06-20'] }
    const slots: [string, string, string] = ['Ярмарок', 'Short list', 'Custom']
    const map = subDatesByDay([ev], slots)
    expect(map.get('2026-06-15')?.[0].label).toBe('Ярмарок')
    expect(map.get('2026-06-20')?.[0].label).toBe('Custom')
    expect(map.has('2026-06-16')).toBe(false)
  })

  it('skips empty sub_date slots', () => {
    const ev = { ...base, sub_dates: ['', '2026-06-18', ''] }
    const slots: [string, string, string] = ['A', 'B', 'C']
    const map = subDatesByDay([ev], slots)
    expect(map.size).toBe(1)
    expect(map.get('2026-06-18')?.[0].label).toBe('B')
  })
})
