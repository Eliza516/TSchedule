import type { DayString } from '@shared/types'
import { atTimeOnDay, addDays, toDayString } from '@shared/time'
import { isDueOn } from '@shared/recurrence'
import * as habitRepo from '../db/repos/habits'
import * as taskRepo from '../db/repos/tasks'
import * as reminderRepo from '../db/repos/reminders'
import { getMeta, setMeta } from '../db/repos/settings'
import * as taskService from './taskService'

const LAST_RUN_KEY = 'lastDailyRun'

/**
 * The once-per-day housekeeping: turn due habits into real tasks and sweep up
 * reminders that have already fired.
 *
 * Note what is deliberately *not* here: unfinished work is never rolled forward
 * automatically. It stays on the day it was planned for until the user triages
 * it in a check-in - otherwise the morning ritual would have nothing to show.
 */
export function runForDay(day: DayString = toDayString(Date.now())): number {
  let created = 0
  for (const habit of habitRepo.listHabitsPlain(true)) {
    const completedThisWeek = habitRepo.completedThisWeek(habit.id, day)
    if (!isDueOn(habit.schedule, day, { completedThisWeek })) continue

    const existing = taskRepo
      .listDay(day)
      .some((task) => task.habitId === habit.id)
    if (existing) continue

    taskService.createTask(
      {
        title: habit.title,
        day,
        startAt: habit.defaultTime ? atTimeOnDay(day, habit.defaultTime) : null,
        estimateMinutes: habit.estimateMinutes ?? null,
        goalId: habit.goalId,
        habitId: habit.id
      },
      { silent: true }
    )
    created += 1
  }

  reminderRepo.pruneOldReminders(new Date(addDays(day, -14)).getTime())
  setMeta(LAST_RUN_KEY, day)
  return created
}

export function lastRunDay(): DayString | null {
  return getMeta(LAST_RUN_KEY)
}

/** Runs the housekeeping if it has not happened yet for `day`. */
export function ensureRanForDay(day: DayString = toDayString(Date.now())): boolean {
  if (lastRunDay() === day) return false
  runForDay(day)
  return true
}
