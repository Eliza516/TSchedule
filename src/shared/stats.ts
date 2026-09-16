import type {
  DayString,
  EstimationAccuracy,
  HabitSchedule,
  HabitStreak,
  Task
} from './types'
import { addDays, daysBetween } from './time'
import { isEligibleOn } from './recurrence'

/**
 * How much longer things actually take than planned. Only tasks that carry both
 * an estimate and logged time can say anything, so everything else is ignored
 * rather than counted as a perfect guess.
 */
export function estimationAccuracy(tasks: Task[]): EstimationAccuracy {
  const usable = tasks.filter(
    (t) => t.status === 'done' && (t.estimateMinutes ?? 0) > 0 && t.actualMinutes > 0
  )
  const estimatedMinutes = usable.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0)
  const actualMinutes = usable.reduce((sum, t) => sum + t.actualMinutes, 0)
  return {
    ratio: estimatedMinutes > 0 ? actualMinutes / estimatedMinutes : null,
    sampleSize: usable.length,
    estimatedMinutes,
    actualMinutes
  }
}

export function describeAccuracy(accuracy: EstimationAccuracy): string | null {
  if (accuracy.ratio == null || accuracy.sampleSize < 3) return null
  const ratio = accuracy.ratio
  if (ratio >= 1.1) return `You typically take ${ratio.toFixed(1)}× your estimate`
  if (ratio <= 0.9) return `You typically finish in ${ratio.toFixed(1)}× your estimate`
  return 'Your estimates are close to reality'
}

/** Suggested estimate once the user's own track record is taken into account. */
export function adjustEstimate(minutes: number, accuracy: EstimationAccuracy): number | null {
  if (accuracy.ratio == null || accuracy.sampleSize < 3) return null
  const adjusted = Math.round((minutes * accuracy.ratio) / 5) * 5
  return adjusted === minutes ? null : Math.max(5, adjusted)
}

export function completionRate(tasks: Task[]): number | null {
  const counted = tasks.filter((t) => t.status !== 'dropped')
  if (counted.length === 0) return null
  return counted.filter((t) => t.status === 'done').length / counted.length
}

/**
 * Habit streaks respect the habit's own schedule: a Mon/Wed/Fri habit is not
 * broken by a quiet Sunday, only by a missed Monday.
 */
export function habitStreak(
  habitId: string,
  schedule: HabitSchedule,
  doneDays: Iterable<DayString>,
  today: DayString,
  historyLength = 84
): HabitStreak {
  const done = new Set(doneDays)
  const history: HabitStreak['history'] = []
  const firstDay = addDays(today, -(historyLength - 1))
  for (let i = 0; i < historyLength; i += 1) {
    const day = addDays(firstDay, i)
    history.push({ day, due: isEligibleOn(schedule, day), done: done.has(day) })
  }

  let current = 0
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i]
    if (!entry.due) continue
    if (entry.done) {
      current += 1
      continue
    }
    // Today still being open should not count as a miss.
    if (entry.day === today) continue
    break
  }

  let longest = 0
  let run = 0
  for (const entry of history) {
    if (!entry.due) continue
    if (entry.done) {
      run += 1
      longest = Math.max(longest, run)
    } else if (entry.day !== today) {
      run = 0
    }
  }

  return { habitId, current, longest: Math.max(longest, current), history }
}

/** Days since the most recent completed task linked to a goal. */
export function daysSinceProgress(lastProgressDay: DayString | null, today: DayString): number | null {
  if (!lastProgressDay) return null
  return Math.max(0, daysBetween(lastProgressDay, today))
}

export function goalProgressRatio(input: {
  milestonesDone: number
  milestonesTotal: number
  tasksDone: number
  tasksTotal: number
  /** pages read, lessons watched - counted separately from the tasks carrying them */
  unitsDone?: number
  unitsTotal?: number
}): number {
  const parts: number[] = []
  if (input.milestonesTotal > 0) parts.push(input.milestonesDone / input.milestonesTotal)
  if (input.tasksTotal > 0) parts.push(input.tasksDone / input.tasksTotal)
  if ((input.unitsTotal ?? 0) > 0) {
    parts.push(Math.min(1, (input.unitsDone ?? 0) / (input.unitsTotal as number)))
  }
  if (parts.length === 0) return 0
  return parts.reduce((a, b) => a + b, 0) / parts.length
}
