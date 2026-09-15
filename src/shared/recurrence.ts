import type { DayString, HabitSchedule } from './types'
import { weekdayIndex } from './time'

/** Whether a habit needs a task generated for `day`. */
export function isDueOn(
  schedule: HabitSchedule,
  day: DayString,
  context: { completedThisWeek?: number } = {}
): boolean {
  switch (schedule.type) {
    case 'daily':
      return true
    case 'weekdays':
      return schedule.days.includes(weekdayIndex(day))
    case 'timesPerWeek': {
      const done = context.completedThisWeek ?? 0
      const target = Math.max(1, schedule.n)
      if (done >= target) return false
      // Only insist once there are exactly as many days left in the week as
      // sessions still owed - before that the user is free to pick their day.
      const daysLeftInWeek = 7 - weekdayIndex(day)
      return daysLeftInWeek <= target - done
    }
  }
}

/** Whether a habit *may* be done on `day`, ignoring how many are still owed. */
export function isEligibleOn(schedule: HabitSchedule, day: DayString): boolean {
  switch (schedule.type) {
    case 'daily':
      return true
    case 'weekdays':
      return schedule.days.includes(weekdayIndex(day))
    case 'timesPerWeek':
      return true
  }
}

export function describeSchedule(schedule: HabitSchedule): string {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  switch (schedule.type) {
    case 'daily':
      return 'Every day'
    case 'weekdays': {
      const days = [...schedule.days].sort((a, b) => a - b)
      if (days.length === 0) return 'Never'
      if (days.length === 7) return 'Every day'
      if (days.length === 5 && days.every((d) => d < 5)) return 'Weekdays'
      if (days.length === 2 && days[0] === 5 && days[1] === 6) return 'Weekends'
      return days.map((d) => names[d]).join(', ')
    }
    case 'timesPerWeek':
      return `${schedule.n}× per week`
  }
}

export function parseSchedule(json: string): HabitSchedule {
  try {
    const parsed = JSON.parse(json) as HabitSchedule
    if (parsed && typeof parsed === 'object' && 'type' in parsed) return parsed
  } catch {
    // fall through to the safe default
  }
  return { type: 'daily' }
}
