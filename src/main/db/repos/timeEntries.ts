import type { DayString, TimeEntry, TimeEntryKind } from '@shared/types'
import { getDb, intToBool, newId } from '../index'
import { dayEnd, dayStart } from './tasks'

interface Row {
  id: string
  task_id: string | null
  kind: string
  started_at: number
  ended_at: number | null
  duration_seconds: number | null
  completed: number
}

function mapEntry(row: Row): TimeEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    kind: row.kind as TimeEntryKind,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    completed: intToBool(row.completed)
  }
}

export function startEntry(taskId: string | null, kind: TimeEntryKind, now = Date.now()): TimeEntry {
  const id = newId('e_')
  getDb()
    .prepare('INSERT INTO time_entries (id, task_id, kind, started_at) VALUES (?, ?, ?, ?)')
    .run(id, taskId, kind, now)
  return { id, taskId, kind, startedAt: now, endedAt: null, durationSeconds: null, completed: false }
}

export function finishEntry(id: string, completed: boolean, now = Date.now()): void {
  getDb()
    .prepare(
      `UPDATE time_entries
       SET ended_at = ?, duration_seconds = MAX(0, (? - started_at) / 1000), completed = ?
       WHERE id = ?`
    )
    .run(now, now, completed ? 1 : 0, id)
}

/** Closes anything left hanging by a crash so totals stay believable. */
export function closeDanglingEntries(now = Date.now()): void {
  getDb()
    .prepare(
      `UPDATE time_entries
       SET ended_at = ?, duration_seconds = MAX(0, (? - started_at) / 1000), completed = 0
       WHERE ended_at IS NULL`
    )
    .run(now, now)
}

export function listForDay(day: DayString): TimeEntry[] {
  return (
    getDb()
      .prepare('SELECT * FROM time_entries WHERE started_at BETWEEN ? AND ? ORDER BY started_at')
      .all(dayStart(day), dayEnd(day)) as Row[]
  ).map(mapEntry)
}

export function minutesForTask(taskId: string): number {
  const row = getDb()
    .prepare(
      "SELECT COALESCE(SUM(duration_seconds), 0) AS s FROM time_entries WHERE task_id = ? AND kind <> 'break'"
    )
    .get(taskId) as { s: number }
  return Math.round(row.s / 60)
}

/**
 * Records time the user reports by hand during the evening wrap-up, for work
 * they did without starting the timer.
 */
export function logManualMinutes(taskId: string, minutes: number, day: DayString): TimeEntry {
  const endedAt = Math.min(Date.now(), dayEnd(day))
  const startedAt = endedAt - minutes * 60_000
  const id = newId('e_')
  getDb()
    .prepare(
      `INSERT INTO time_entries (id, task_id, kind, started_at, ended_at, duration_seconds, completed)
       VALUES (?, ?, 'free', ?, ?, ?, 1)`
    )
    .run(id, taskId, startedAt, endedAt, minutes * 60)
  return {
    id,
    taskId,
    kind: 'free',
    startedAt,
    endedAt,
    durationSeconds: minutes * 60,
    completed: true
  }
}
