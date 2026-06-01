import { describe, it, expect } from 'vitest'
import { generateOccurrences, recurrenceLabel, toRRule } from '../recurrence'

// ── Helper ────────────────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD (local date of the Date object) */
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── generateOccurrences ───────────────────────────────────────────────────────

describe('generateOccurrences', () => {
  it('daily · count=3 → exactly 3 dates', () => {
    const result = generateOccurrences('2026-06-01T09:00:00Z', {
      frequency: 'daily',
      end_type: 'count',
      count: 3,
    })
    expect(result).toHaveLength(3)
    expect(toYMD(result[0])).toBe('2026-06-01')
    expect(toYMD(result[1])).toBe('2026-06-02')
    expect(toYMD(result[2])).toBe('2026-06-03')
  })

  it('weekly on Mon,Wed · count=4 → 4 occurrences all on Mon or Wed', () => {
    // 2026-06-01 is a Monday — use it as startAt so the first window starts clean
    const result = generateOccurrences('2026-06-01T09:00:00Z', {
      frequency: 'weekly',
      days_of_week: ['Mon', 'Wed'],
      end_type: 'count',
      count: 4,
    })
    expect(result).toHaveLength(4)
    for (const d of result) {
      // getUTCDay: 1=Mon, 3=Wed
      expect([1, 3]).toContain(d.getUTCDay())
    }
    // First occurrence is the start itself (Monday)
    expect(toYMD(result[0])).toBe('2026-06-01')
    // Second is Wednesday of the same week
    expect(toYMD(result[1])).toBe('2026-06-03')
  })

  it('biweekly · until 2026-07-14 → correct count (every 2 weeks from Jun 2)', () => {
    // 2026-06-02 is a Tuesday
    const result = generateOccurrences('2026-06-02T09:00:00Z', {
      frequency: 'biweekly',
      end_type: 'date',
      until: '2026-07-14',
    })
    // Jun 2, Jun 16, Jun 30, Jul 14 → 4 occurrences
    expect(result).toHaveLength(4)
    expect(toYMD(result[0])).toBe('2026-06-02')
    expect(toYMD(result[1])).toBe('2026-06-16')
    expect(toYMD(result[2])).toBe('2026-06-30')
    expect(toYMD(result[3])).toBe('2026-07-14')
  })

  it('monthly · never · horizon=365 → ≤ 12 dates', () => {
    const result = generateOccurrences('2026-01-15T09:00:00Z', {
      frequency: 'monthly',
      end_type: 'never',
    }, 365)
    // 365 days from Jan 15 reaches the following Jan 15, so ≤ 13 monthly occurrences
    expect(result.length).toBeLessThanOrEqual(13)
    expect(result.length).toBeGreaterThan(0)
    // All should be on the 15th
    for (const d of result) {
      expect(d.getUTCDate()).toBe(15)
    }
  })

  it('monthly on Jan 31 → clamps to last day of shorter months', () => {
    const result = generateOccurrences('2026-01-31T00:00:00Z', {
      frequency: 'monthly',
      end_type: 'count',
      count: 3,
    })
    expect(result).toHaveLength(3)
    expect(toYMD(result[0])).toBe('2026-01-31')
    // Feb 2026 has 28 days
    expect(toYMD(result[1])).toBe('2026-02-28')
    // March has 31 days → Mar 31
    expect(toYMD(result[2])).toBe('2026-03-31')
  })

  it('daily · never · horizonDays=5 → exactly 6 dates (day 0 through day 5)', () => {
    const result = generateOccurrences('2026-06-01T00:00:00Z', {
      frequency: 'daily',
      end_type: 'never',
    }, 5)
    // horizon = startAt + 5 days (inclusive), so 6 dates: Jun 1-6
    expect(result.length).toBe(6)
  })
})

// ── recurrenceLabel ───────────────────────────────────────────────────────────

describe('recurrenceLabel', () => {
  it('daily with count', () => {
    expect(recurrenceLabel({ frequency: 'daily', end_type: 'count', count: 10 }))
      .toBe('Repeats daily · 10 times')
  })

  it('daily with count=1 uses singular', () => {
    expect(recurrenceLabel({ frequency: 'daily', end_type: 'count', count: 1 }))
      .toBe('Repeats daily · 1 time')
  })

  it('weekly with days_of_week and until date', () => {
    expect(recurrenceLabel({
      frequency: 'weekly',
      days_of_week: ['Mon', 'Wed'],
      end_type: 'date',
      until: '2026-12-31',
    })).toBe('Repeats weekly on Mon, Wed · until 2026-12-31')
  })

  it('biweekly with never', () => {
    expect(recurrenceLabel({ frequency: 'biweekly', end_type: 'never' }))
      .toBe('Repeats every two weeks · forever')
  })

  it('monthly with never', () => {
    expect(recurrenceLabel({ frequency: 'monthly', end_type: 'never' }))
      .toBe('Repeats monthly · forever')
  })

  it('monthly with until date', () => {
    expect(recurrenceLabel({ frequency: 'monthly', end_type: 'date', until: '2027-06-01' }))
      .toBe('Repeats monthly · until 2027-06-01')
  })
})

// ── toRRule ───────────────────────────────────────────────────────────────────

describe('toRRule', () => {
  it('weekly with BYDAY and COUNT', () => {
    expect(toRRule({
      frequency: 'weekly',
      days_of_week: ['Mon', 'Wed'],
      end_type: 'count',
      count: 10,
    })).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10')
  })

  it('monthly with UNTIL', () => {
    expect(toRRule({ frequency: 'monthly', end_type: 'date', until: '2026-12-31' }))
      .toBe('RRULE:FREQ=MONTHLY;UNTIL=20261231T000000Z')
  })

  it('daily with COUNT', () => {
    expect(toRRule({ frequency: 'daily', end_type: 'count', count: 5 }))
      .toBe('RRULE:FREQ=DAILY;COUNT=5')
  })

  it('biweekly uses FREQ=WEEKLY;INTERVAL=2', () => {
    expect(toRRule({
      frequency: 'biweekly',
      days_of_week: ['Fri'],
      end_type: 'never',
    })).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR')
  })

  it('daily forever has no COUNT or UNTIL', () => {
    const rrule = toRRule({ frequency: 'daily', end_type: 'never' })
    expect(rrule).toBe('RRULE:FREQ=DAILY')
    expect(rrule).not.toContain('COUNT')
    expect(rrule).not.toContain('UNTIL')
  })
})
