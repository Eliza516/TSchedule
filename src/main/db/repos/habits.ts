import type { DayString, Habit, HabitDraft, HabitWithStreak } from '@shared/types'
import { addDays, startOfWeek } from '@shared/time'
import { parseSchedule } from '@shared/recurrence'
import { isDueOn } from '@shared/recurrence'
import { habitStreak } from '@shared/stats'
import { getDb, intToBool, newId } from '../index'

interface Row {
  id: string
  title: string
  schedule_json: string
  goal_id: string | null
  estimate_minutes: number | null
  default_time: string | null
  active: number
  created_at: number
}

function mapHabit(row: Row): Habit {
  return {
    id: row.id,
    title: row.title,
    schedule: parseSchedule(row.schedule_json),
    goalId: row.goal_id,
    estimateMinutes: row.estimate_minutes,
    defaultTime: row.default_time,
    active: intToBool(row.active),
    createdAt: row.created_at
  }
}

export function listHabitsPlain(activeOnly = false): Habit[] {
  const sql = activeOnly
    ? 'SELECT * FROM habits WHERE active = 1 ORDER BY created_at'
    : 'SELECT * FROM habits ORDER BY active DESC, created_at'
  return (getDb().prepare(sql).all() as Row[]).map(mapHabit)
}

export function getHabit(id: string): Habit | null {
  const row = getDb().prepare('SELECT * FROM habits WHERE id = ?').get(id) as Row | undefined
  return row ? mapHabit(row) : null
}

export function doneDays(habitId: string, since: DayString): DayString[] {
  return (
    getDb()
      .prepare('SELECT day FROM habit_logs WHERE habit_id = ? AND day >= ? ORDER BY day')
      .all(habitId, since) as { day: string }[]
  ).map((r) => r.day)
}

export function completedThisWeek(habitId: string, day: DayString): number {
  const from = startOfWeek(day)
  const to = addDays(from, 6)
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM habit_logs WHERE habit_id = ? AND day BETWEEN ? AND ?')
    .get(habitId, from, to) as { n: number }
  return row.n
}

export function listHabits(today: DayString): HabitWithStreak[] {
  const since = addDays(today, -83)
  return listHabitsPlain().map((habit) => {
    const days = doneDays(habit.id, since)
    const thisWeek = completedThisWeek(habit.id, today)
    return {
      ...habit,
      streak: habitStreak(habit.id, habit.schedule, days, today),
      completedThisWeek: thisWeek,
      dueToday: habit.active && isDueOn(habit.schedule, today, { completedThisWeek: thisWeek }),
      doneToday: days.includes(today)
    }
  })
}

export function createHabit(draft: HabitDraft, now = Date.now()): Habit {
  const id = newId('h_')
  getDb()
    .prepare(
      `INSERT INTO habits (id, title, schedule_json, goal_id, estimate_minutes, default_time, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(
      id,
      draft.title.trim(),
      JSON.stringify(draft.schedule),
      draft.goalId ?? null,
      draft.estimateMinutes ?? null,
      draft.defaultTime ?? null,
      now
    )
  return getHabit(id)!
}

export function updateHabit(id: string, patch: Partial<HabitDraft> & { active?: boolean }): Habit {
  const assignments: string[] = []
  const values: Record<string, unknown> = { id }
  const simple: Record<string, string> = {
    title: 'title',
    goalId: 'goal_id',
    estimateMinutes: 'estimate_minutes',
    defaultTime: 'default_time'
  }
  for (const [key, column] of Object.entries(simple)) {
    const value = (patch as Record<string, unknown>)[key]
    if (value === undefined) continue
    assignments.push(`${column} = @${key}`)
    values[key] = value
  }
  if (patch.schedule !== undefined) {
    assignments.push('schedule_json = @schedule')
    values.schedule = JSON.stringify(patch.schedule)
  }
  if (patch.active !== undefined) {
    assignments.push('active = @active')
    values.active = patch.active ? 1 : 0
  }
  if (assignments.length > 0) {
    getDb().prepare(`UPDATE habits SET ${assignments.join(', ')} WHERE id = @id`).run(values)
  }
  const habit = getHabit(id)
  if (!habit) throw new Error(`Habit ${id} no longer exists`)
  return habit
}

export function deleteHabit(id: string): void {
  getDb().prepare('DELETE FROM habits WHERE id = ?').run(id)
}

export function logHabit(habitId: string, day: DayString, now = Date.now()): void {
  getDb()
    .prepare(
      'INSERT INTO habit_logs (habit_id, day, done_at) VALUES (?, ?, ?) ON CONFLICT(habit_id, day) DO NOTHING'
    )
    .run(habitId, day, now)
}

export function unlogHabit(habitId: string, day: DayString): void {
  getDb().prepare('DELETE FROM habit_logs WHERE habit_id = ? AND day = ?').run(habitId, day)
}
