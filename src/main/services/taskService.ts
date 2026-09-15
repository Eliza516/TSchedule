import type { DayString, NotDoneReason, Task, TaskDraft, TaskPatch, TaskStatus } from '@shared/types'
import * as taskRepo from '../db/repos/tasks'
import * as habitRepo from '../db/repos/habits'
import * as reminderRepo from '../db/repos/reminders'
import * as entryRepo from '../db/repos/timeEntries'
import { getSettings } from '../db/repos/settings'
import { broadcast } from '../windows'

/**
 * Task writes funnel through here rather than going straight to the repository,
 * so the reminder queue, habit log and open windows never fall out of step with
 * the task list.
 */

function afterWrite(task: Task, options: { silent?: boolean } = {}): Task {
  reminderRepo.syncForTask(task, getSettings().defaultRemindMinutesBefore)
  if (!options.silent) broadcast('data:changed', { scope: 'tasks' })
  return task
}

export function createTask(draft: TaskDraft, options: { silent?: boolean } = {}): Task {
  return afterWrite(taskRepo.createTask(draft), options)
}

export function updateTask(id: string, patch: TaskPatch): Task {
  return afterWrite(taskRepo.updateTask(id, patch))
}

export function setStatus(
  id: string,
  status: TaskStatus,
  reason: NotDoneReason | null = null,
  options: { silent?: boolean } = {}
): Task {
  const task = taskRepo.setStatus(id, status, reason)
  // A task generated from a habit keeps that habit's streak in sync.
  if (task.habitId) {
    if (status === 'done') habitRepo.logHabit(task.habitId, task.day)
    else habitRepo.unlogHabit(task.habitId, task.day)
  }
  return afterWrite(task, options)
}

export function moveTask(
  id: string,
  day: DayString,
  beforeTaskId: string | null = null,
  options: { countAsRollover?: boolean; silent?: boolean } = {}
): Task {
  const task = taskRepo.moveTask(id, day, beforeTaskId, {
    countAsRollover: options.countAsRollover
  })
  return afterWrite(task, options)
}

export function setMit(id: string, isMit: boolean): Task[] {
  const result = taskRepo.setMit(id, isMit)
  broadcast('data:changed', { scope: 'tasks' })
  return result
}

export function deleteTask(id: string): void {
  reminderRepo.deleteForTask(id)
  taskRepo.deleteTask(id)
  broadcast('data:changed', { scope: 'tasks' })
}

/**
 * Time the user reports during the evening wrap-up for work they did without
 * running the timer. Ignored when the timer already covered the task, so a
 * rough guess never overwrites measured time.
 */
export function recordManualMinutes(taskId: string, minutes: number, day: DayString): void {
  if (minutes <= 0) return
  if (entryRepo.minutesForTask(taskId) > 0) return
  entryRepo.logManualMinutes(taskId, minutes, day)
}
