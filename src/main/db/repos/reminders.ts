import type { Task } from '@shared/types'
import { MINUTE_MS } from '@shared/time'
import { getDb, newId } from '../index'

export type ReminderKind = 'lead' | 'start'

export interface DueReminder {
  id: string
  taskId: string
  kind: ReminderKind
  fireAt: number
}

/**
 * Rewrites the pending reminders for one task. Called after every change that
 * can move a start time, so the queue never drifts from the task list.
 */
export function syncForTask(task: Task, defaultLeadMinutes: number, now = Date.now()): void {
  const db = getDb()
  db.transaction(() => {
    db.prepare('DELETE FROM reminders WHERE task_id = ? AND fired_at IS NULL').run(task.id)
    if (task.startAt == null) return
    if (task.status === 'done' || task.status === 'dropped') return

    const lead = task.remindMinutesBefore ?? defaultLeadMinutes
    const insert = db.prepare(
      'INSERT INTO reminders (id, task_id, kind, fire_at) VALUES (?, ?, ?, ?)'
    )
    const leadAt = task.startAt - lead * MINUTE_MS
    if (lead > 0 && leadAt > now) insert.run(newId('r_'), task.id, 'lead', leadAt)
    if (task.startAt > now) insert.run(newId('r_'), task.id, 'start', task.startAt)
  })()
}

export function deleteForTask(taskId: string): void {
  getDb().prepare('DELETE FROM reminders WHERE task_id = ?').run(taskId)
}

export function dueReminders(now: number): DueReminder[] {
  return (
    getDb()
      .prepare('SELECT id, task_id, kind, fire_at FROM reminders WHERE fired_at IS NULL AND fire_at <= ? ORDER BY fire_at')
      .all(now) as { id: string; task_id: string; kind: string; fire_at: number }[]
  ).map((r) => ({ id: r.id, taskId: r.task_id, kind: r.kind as ReminderKind, fireAt: r.fire_at }))
}

/** Marked before the notification is shown, so a crash cannot double-fire it. */
export function markFired(ids: string[], now = Date.now()): void {
  if (ids.length === 0) return
  const db = getDb()
  const update = db.prepare('UPDATE reminders SET fired_at = ? WHERE id = ?')
  db.transaction(() => {
    for (const id of ids) update.run(now, id)
  })()
}

export function pruneOldReminders(before: number): void {
  getDb().prepare('DELETE FROM reminders WHERE fired_at IS NOT NULL AND fire_at < ?').run(before)
}
