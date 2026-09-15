import { describe, expect, it } from 'vitest'
import { describeSchedule, isDueOn, parseSchedule } from '@shared/recurrence'

// 2026-03-09 is a Monday.
const MON = '2026-03-09'
const WED = '2026-03-11'
const SAT = '2026-03-14'
const SUN = '2026-03-15'

describe('isDueOn', () => {
  it('fires every day for a daily habit', () => {
    expect(isDueOn({ type: 'daily' }, SUN)).toBe(true)
  })

  it('respects chosen weekdays', () => {
    const mwf = { type: 'weekdays' as const, days: [0, 2, 4] }
    expect(isDueOn(mwf, MON)).toBe(true)
    expect(isDueOn(mwf, WED)).toBe(true)
    expect(isDueOn(mwf, SAT)).toBe(false)
  })

  it('leaves a times-per-week habit free early in the week', () => {
    const thrice = { type: 'timesPerWeek' as const, n: 3 }
    expect(isDueOn(thrice, MON, { completedThisWeek: 0 })).toBe(false)
  })

  it('insists once the remaining days only just cover what is owed', () => {
    const thrice = { type: 'timesPerWeek' as const, n: 3 }
    // From Friday there are exactly 3 days left for 3 outstanding sessions.
    expect(isDueOn(thrice, '2026-03-13', { completedThisWeek: 0 })).toBe(true)
    // With one left to do there is still Sunday, so Saturday stays optional.
    expect(isDueOn(thrice, SAT, { completedThisWeek: 2 })).toBe(false)
    expect(isDueOn(thrice, SUN, { completedThisWeek: 2 })).toBe(true)
  })

  it('stops once the weekly target is met', () => {
    expect(isDueOn({ type: 'timesPerWeek', n: 3 }, SUN, { completedThisWeek: 3 })).toBe(false)
  })
})

describe('describeSchedule', () => {
  it('names the common shapes', () => {
    expect(describeSchedule({ type: 'daily' })).toBe('Every day')
    expect(describeSchedule({ type: 'weekdays', days: [0, 1, 2, 3, 4] })).toBe('Weekdays')
    expect(describeSchedule({ type: 'weekdays', days: [5, 6] })).toBe('Weekends')
    expect(describeSchedule({ type: 'weekdays', days: [0, 2] })).toBe('Mon, Wed')
    expect(describeSchedule({ type: 'timesPerWeek', n: 3 })).toBe('3× per week')
  })
})

describe('parseSchedule', () => {
  it('falls back to daily on malformed data', () => {
    expect(parseSchedule('not json')).toEqual({ type: 'daily' })
    expect(parseSchedule('{"type":"weekdays","days":[1]}')).toEqual({ type: 'weekdays', days: [1] })
  })
})
