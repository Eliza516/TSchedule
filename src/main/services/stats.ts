import type { DayString, NotDoneReason, StatsBucket, StatsReport } from '@shared/types'
import { addDays, daysBetween } from '@shared/time'
import { checkinStreak } from '@shared/checkinPolicy'
import { completionRate, estimationAccuracy } from '@shared/stats'
import { getDb } from '../db'
import * as taskRepo from '../db/repos/tasks'
import * as checkinRepo from '../db/repos/checkins'
import { dayEnd, dayStart } from '../db/repos/tasks'

/**
 * Logged time is attributed to the day of the task it belongs to rather than
 * the wall-clock moment it was recorded, so a session that runs past midnight
 * still counts towards the day it was planned for.
 */
function minutesBy(sql: string, from: DayString, to: DayString): StatsBucket[] {
  return (getDb().prepare(sql).all(from, to) as { key: string; label: string; color: string | null; seconds: number }[])
    .map((row) => ({
      key: row.key,
      label: row.label,
      color: row.color,
      minutes: Math.round(row.seconds / 60)
    }))
    .filter((bucket) => bucket.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
}

const BY_TAG = `
  SELECT tt.tag AS key, tt.tag AS label, NULL AS color,
         COALESCE(SUM(e.duration_seconds), 0) AS seconds
  FROM task_tags tt
  JOIN tasks t ON t.id = tt.task_id
  LEFT JOIN time_entries e ON e.task_id = t.id AND e.kind <> 'break'
  WHERE t.day BETWEEN ? AND ?
  GROUP BY tt.tag`

const BY_GOAL = `
  SELECT g.id AS key, g.title AS label, g.color AS color,
         COALESCE(SUM(e.duration_seconds), 0) AS seconds
  FROM goals g
  JOIN tasks t ON t.goal_id = g.id
  LEFT JOIN time_entries e ON e.task_id = t.id AND e.kind <> 'break'
  WHERE t.day BETWEEN ? AND ?
  GROUP BY g.id`

export function buildReport(from: DayString, to: DayString): StatsReport {
  const db = getDb()
  const tasks = taskRepo.listRange(from, to)

  const pomodoros = db
    .prepare(
      `SELECT COUNT(*) AS n FROM time_entries
       WHERE kind = 'pomodoro' AND completed = 1 AND started_at BETWEEN ? AND ?`
    )
    .get(dayStart(from), dayEnd(to)) as { n: number }

  const reasonRows = db
    .prepare(
      `SELECT not_done_reason AS reason, COUNT(*) AS n FROM tasks
       WHERE day BETWEEN ? AND ? AND not_done_reason IS NOT NULL
       GROUP BY not_done_reason ORDER BY n DESC`
    )
    .all(from, to) as { reason: NotDoneReason; n: number }[]

  const byDay: StatsReport['byDay'] = []
  for (let i = 0; i <= daysBetween(from, to); i += 1) {
    const day = addDays(from, i)
    const ofDay = tasks.filter((t) => t.day === day)
    byDay.push({
      day,
      minutes: ofDay.reduce((sum, t) => sum + t.actualMinutes, 0),
      done: ofDay.filter((t) => t.status === 'done').length
    })
  }

  const checkinRows = checkinRepo.listRows(from)
  const daysWithActivity = new Set(tasks.map((t) => t.day))
  const closedOut = checkinRows.filter(
    (row) => row.kind === 'evening' && row.status === 'completed' && daysWithActivity.has(row.day)
  ).length

  return {
    from,
    to,
    totalMinutes: tasks.reduce((sum, t) => sum + t.actualMinutes, 0),
    completionRate: completionRate(tasks),
    tasksDone: tasks.filter((t) => t.status === 'done').length,
    tasksPlanned: tasks.filter((t) => t.status !== 'dropped').length,
    pomodoros: pomodoros.n,
    accuracy: estimationAccuracy(tasks),
    byTag: minutesBy(BY_TAG, from, to),
    byGoal: minutesBy(BY_GOAL, from, to),
    byDay,
    notDoneReasons: reasonRows.map((row) => ({ reason: row.reason, count: row.n })),
    checkinStreak: checkinStreak(checkinRepo.listRows(addDays(to, -90)), to),
    checkinRate: daysWithActivity.size > 0 ? closedOut / daysWithActivity.size : null
  }
}
