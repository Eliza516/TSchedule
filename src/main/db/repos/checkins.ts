import type { CheckinKind, CheckinRow, CheckinTrigger, DayString } from '@shared/types'
import { addDays } from '@shared/time'
import { getDb } from '../index'

interface Row {
  day: string
  kind: string
  status: string
  completed_at: number | null
  snooze_count: number
  snoozed_until: number | null
  trigger_source: string | null
  created_at: number
}

function mapRow(row: Row): CheckinRow {
  return {
    day: row.day,
    kind: row.kind as CheckinKind,
    status: row.status as CheckinRow['status'],
    completedAt: row.completed_at,
    snoozeCount: row.snooze_count,
    snoozedUntil: row.snoozed_until,
    triggerSource: row.trigger_source as CheckinTrigger | null
  }
}

/** Rows from `since` onwards - enough for the policy and the streak. */
export function listRows(since: DayString): CheckinRow[] {
  return (
    getDb().prepare('SELECT * FROM checkins WHERE day >= ? ORDER BY day').all(since) as Row[]
  ).map(mapRow)
}

export function getRow(day: DayString, kind: CheckinKind): CheckinRow | null {
  const row = getDb().prepare('SELECT * FROM checkins WHERE day = ? AND kind = ?').get(day, kind) as
    | Row
    | undefined
  return row ? mapRow(row) : null
}

function ensureRow(day: DayString, kind: CheckinKind, trigger: CheckinTrigger | null): void {
  getDb()
    .prepare(
      `INSERT INTO checkins (day, kind, status, trigger_source, created_at)
       VALUES (?, ?, 'pending', ?, ?)
       ON CONFLICT(day, kind) DO NOTHING`
    )
    .run(day, kind, trigger, Date.now())
}

export function markOpened(day: DayString, kind: CheckinKind, trigger: CheckinTrigger): void {
  ensureRow(day, kind, trigger)
}

export function markCompleted(day: DayString, kind: CheckinKind, now = Date.now()): void {
  ensureRow(day, kind, null)
  getDb()
    .prepare(
      `UPDATE checkins SET status = 'completed', completed_at = ?, snoozed_until = NULL
       WHERE day = ? AND kind = ?`
    )
    .run(now, day, kind)
}

/** Pushes a check-in back and records that an allowance was spent. */
export function snooze(day: DayString, kind: CheckinKind, until: number): CheckinRow {
  ensureRow(day, kind, null)
  getDb()
    .prepare(
      'UPDATE checkins SET snooze_count = snooze_count + 1, snoozed_until = ? WHERE day = ? AND kind = ?'
    )
    .run(until, day, kind)
  return getRow(day, kind)!
}

export function resetDay(day: DayString): void {
  getDb().prepare('DELETE FROM checkins WHERE day = ?').run(day)
}

/**
 * Days before `today` that the user clearly worked on but never closed out.
 *
 * Derived from real activity rather than from a marker written when the machine
 * sleeps, so a force-quit, a crash or a flat battery still leaves the debt
 * standing - which is the whole point of the wrap-up ritual.
 */
export function owedEveningDays(today: DayString, lookbackDays = 7): DayString[] {
  const since = addDays(today, -lookbackDays)
  const rows = getDb()
    .prepare(
      `SELECT day FROM (
         SELECT DISTINCT day FROM tasks       WHERE day >= ? AND day < ?
         UNION
         SELECT DISTINCT day FROM daily_notes WHERE day >= ? AND day < ?
       )
       WHERE day NOT IN (
         SELECT day FROM checkins WHERE kind = 'evening' AND status = 'completed'
       )
       ORDER BY day`
    )
    .all(since, today, since, today) as { day: string }[]
  return rows.map((r) => r.day)
}
