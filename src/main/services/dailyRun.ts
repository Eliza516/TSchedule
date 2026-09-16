import type { DayString } from '@shared/types'
import { atTimeOnDay, addDays, toDayString } from '@shared/time'
import { isDueOn } from '@shared/recurrence'
import { describeAssignment, isStudyDay, paceFor } from '@shared/studyPlan'
import * as habitRepo from '../db/repos/habits'
import * as materialRepo from '../db/repos/materials'
import * as taskRepo from '../db/repos/tasks'
import * as reminderRepo from '../db/repos/reminders'
import { getMeta, setMeta } from '../db/repos/settings'
import * as taskService from './taskService'

const LAST_RUN_KEY = 'lastDailyRun'

/**
 * A day's share of every course and book being worked through.
 *
 * The share is worked out fresh from what is still left, so a missed day is
 * absorbed by the days that follow instead of leaving a stale task behind.
 * Exported on its own because a material added at noon should show up in today
 * rather than tomorrow.
 */
export function generateMaterialTasks(day: DayString = toDayString(Date.now())): number {
  let created = 0
  const existing = taskRepo.listDay(day)

  for (const material of materialRepo.listMaterials({ activeOnly: true })) {
    if (!isStudyDay(material.weekdays, day)) continue
    if (existing.some((task) => task.materialId === material.id)) continue

    const pace = paceFor(material, materialRepo.unitsDone(material.id), day)
    if (pace.remainingUnits === 0 || pace.unitsToday === 0) continue

    taskService.createTask(
      {
        title: describeAssignment(material, pace, materialRepo.listSections(material.id)),
        day,
        startAt: material.studyTime ? atTimeOnDay(day, material.studyTime) : null,
        estimateMinutes: pace.minutesToday,
        goalId: material.goalId,
        url: material.url,
        materialId: material.id,
        plannedUnits: pace.unitsToday,
        unitFrom: pace.unitFrom,
        unitTo: pace.unitTo
      },
      { silent: true }
    )
    created += 1
  }
  return created
}

/**
 * The once-per-day housekeeping: turn due habits and study materials into real
 * tasks, and sweep up reminders that have already fired.
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

  created += generateMaterialTasks(day)

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
