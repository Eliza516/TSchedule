import { describe, expect, it } from 'vitest'
import {
  checkinStreak,
  resolvePendingCheckin,
  shouldBlockQuit,
  snoozesLeft,
  type CheckinPolicyInput
} from '@shared/checkinPolicy'
import { DEFAULT_SETTINGS, type CheckinRow, type CheckinTrigger } from '@shared/types'

const TODAY = '2026-03-10'
const YESTERDAY = '2026-03-09'

/** Local instant for 'HH:mm' on a day, so tests read like a wall clock. */
function at(day: string, hhmm: string): number {
  const [y, m, d] = day.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0).getTime()
}

function row(partial: Partial<CheckinRow> & Pick<CheckinRow, 'day' | 'kind'>): CheckinRow {
  return {
    status: 'pending',
    completedAt: null,
    snoozeCount: 0,
    snoozedUntil: null,
    triggerSource: null,
    ...partial
  }
}

function input(overrides: Partial<CheckinPolicyInput> = {}): CheckinPolicyInput {
  return {
    now: at(TODAY, '09:00'),
    today: TODAY,
    owedEveningDays: [],
    rows: [],
    trigger: 'resume' as CheckinTrigger,
    settings: DEFAULT_SETTINGS,
    ...overrides
  }
}

describe('morning check-in', () => {
  it('fires when the machine wakes up inside the morning window', () => {
    const decision = resolvePendingCheckin(input({ now: at(TODAY, '08:30'), trigger: 'resume' }))
    expect(decision).toEqual({ kind: 'morning', day: TODAY, trigger: 'resume', overdue: false })
  })

  it('stays quiet before the morning window opens', () => {
    expect(resolvePendingCheckin(input({ now: at(TODAY, '05:30') }))).toBeNull()
  })

  it('is skipped once the evening window has opened - planning at 19:00 is noise', () => {
    expect(resolvePendingCheckin(input({ now: at(TODAY, '19:00'), trigger: 'unlock' }))).toBeNull()
  })

  it('does not come back after it has been completed', () => {
    const rows = [row({ day: TODAY, kind: 'morning', status: 'completed', completedAt: at(TODAY, '08:00') })]
    expect(resolvePendingCheckin(input({ rows }))).toBeNull()
  })

  it('fires on every presence trigger, not just launch', () => {
    for (const trigger of ['launch', 'resume', 'unlock', 'activate', 'tick'] as CheckinTrigger[]) {
      expect(resolvePendingCheckin(input({ trigger }))?.kind).toBe('morning')
    }
  })
})

describe('snoozing', () => {
  it('holds the check-in back until the snooze expires', () => {
    const rows = [row({ day: TODAY, kind: 'morning', snoozeCount: 1, snoozedUntil: at(TODAY, '09:10') })]
    expect(resolvePendingCheckin(input({ now: at(TODAY, '09:05'), rows }))).toBeNull()
    expect(resolvePendingCheckin(input({ now: at(TODAY, '09:11'), rows }))?.kind).toBe('morning')
  })

  it('stops honouring snoozes once the allowance is spent', () => {
    const rows = [
      row({ day: TODAY, kind: 'morning', snoozeCount: 3, snoozedUntil: at(TODAY, '23:00') })
    ]
    expect(resolvePendingCheckin(input({ rows }))?.kind).toBe('morning')
  })

  it('counts the remaining allowance', () => {
    expect(snoozesLeft(undefined, 2)).toBe(2)
    expect(snoozesLeft(row({ day: TODAY, kind: 'morning', snoozeCount: 2 }), 2)).toBe(0)
  })
})

describe('evening check-in', () => {
  it('fires at the scheduled time', () => {
    const decision = resolvePendingCheckin(input({ now: at(TODAY, '23:30'), trigger: 'tick' }))
    expect(decision).toEqual({ kind: 'evening', day: TODAY, trigger: 'tick', overdue: false })
  })

  it('does not fire early on an ordinary tick', () => {
    expect(resolvePendingCheckin(input({ now: at(TODAY, '22:00'), trigger: 'tick' }))).toBeNull()
  })

  it('blocks quitting after the evening window opens', () => {
    const decision = shouldBlockQuit(input({ now: at(TODAY, '19:30') }))
    expect(decision).toMatchObject({ kind: 'evening', day: TODAY })
  })

  it('lets the app quit during the working day', () => {
    expect(shouldBlockQuit(input({ now: at(TODAY, '15:00') }))).toBeNull()
  })

  it('lets the app quit once the day is already closed out', () => {
    const rows = [row({ day: TODAY, kind: 'evening', status: 'completed', completedAt: at(TODAY, '23:40') })]
    expect(shouldBlockQuit(input({ now: at(TODAY, '23:50'), rows }))).toBeNull()
  })

  it('opens on demand at any hour', () => {
    const decision = resolvePendingCheckin(input({ now: at(TODAY, '15:00'), trigger: 'manual' }))
    expect(decision).toMatchObject({ kind: 'evening', day: TODAY })
  })
})

describe('unpaid debt from a previous day', () => {
  it('is settled before this morning s planning', () => {
    const decision = resolvePendingCheckin(
      input({ now: at(TODAY, '08:30'), owedEveningDays: [YESTERDAY], trigger: 'resume' })
    )
    expect(decision).toEqual({ kind: 'evening', day: YESTERDAY, trigger: 'resume', overdue: true })
  })

  it('works through a backlog oldest first', () => {
    const decision = resolvePendingCheckin(
      input({ owedEveningDays: ['2026-03-07', '2026-03-08', YESTERDAY] })
    )
    expect(decision?.day).toBe('2026-03-07')
  })

  it('hands over to the morning check-in once the backlog is paid', () => {
    const rows = [row({ day: YESTERDAY, kind: 'evening', status: 'completed', completedAt: at(TODAY, '08:10') })]
    const decision = resolvePendingCheckin(input({ owedEveningDays: [YESTERDAY], rows }))
    expect(decision?.kind).toBe('morning')
    expect(decision?.day).toBe(TODAY)
  })

  it('never treats today as a debt', () => {
    expect(resolvePendingCheckin(input({ now: at(TODAY, '05:00'), owedEveningDays: [TODAY] }))).toBeNull()
  })
})

describe('check-in streak', () => {
  const rows = [
    row({ day: '2026-03-07', kind: 'evening', status: 'completed' }),
    row({ day: '2026-03-08', kind: 'evening', status: 'completed' }),
    row({ day: YESTERDAY, kind: 'evening', status: 'completed' })
  ]

  it('counts back from yesterday while today is still open', () => {
    expect(checkinStreak(rows, TODAY)).toBe(3)
  })

  it('includes today once it is closed out', () => {
    expect(checkinStreak([...rows, row({ day: TODAY, kind: 'evening', status: 'completed' })], TODAY)).toBe(4)
  })

  it('breaks on a missed day', () => {
    const gapped = rows.filter((r) => r.day !== '2026-03-08')
    expect(checkinStreak(gapped, TODAY)).toBe(1)
  })
})
