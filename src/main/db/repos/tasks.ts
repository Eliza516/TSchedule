import type {
  DayString,
  DaySummary,
  NotDoneReason,
  Task,
  TaskDraft,
  TaskPatch,
  TaskStatus
} from '@shared/types'
import { getDb, intToBool, newId, type Db } from '../index'

interface TaskRow {
  id: string
  title: string
  notes: string | null
  day: string
  start_at: number | null
  estimate_minutes: number | null
  status: string
  not_done_reason: string | null
  is_mit: number
  sort_order: number
  goal_id: string | null
  milestone_id: string | null
  habit_id: string | null
  material_id: string | null
  planned_units: number | null
  done_units: number | null
  unit_from: number | null
  unit_to: number | null
  url: string | null
  remind_minutes_before: number | null
  rolled_over_count: number
  original_day: string | null
  completed_at: number | null
  created_at: number
  updated_at: number
  actual_seconds: number
  tag_list: string | null
}

/**
 * Tags and logged time come along as aggregates so a day's list is one query
 * rather than one per task.
 */
const SELECT = `
  SELECT t.*,
    COALESCE((SELECT SUM(e.duration_seconds) FROM time_entries e
              WHERE e.task_id = t.id AND e.kind <> 'break'), 0) AS actual_seconds,
    (SELECT GROUP_CONCAT(tag) FROM (SELECT tt.tag FROM task_tags tt
                                    WHERE tt.task_id = t.id ORDER BY tt.tag)) AS tag_list
  FROM tasks t`

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    day: row.day,
    startAt: row.start_at,
    estimateMinutes: row.estimate_minutes,
    status: row.status as TaskStatus,
    notDoneReason: row.not_done_reason as NotDoneReason | null,
    isMit: intToBool(row.is_mit),
    sortOrder: row.sort_order,
    goalId: row.goal_id,
    milestoneId: row.milestone_id,
    habitId: row.habit_id,
    materialId: row.material_id,
    plannedUnits: row.planned_units,
    doneUnits: row.done_units,
    unitFrom: row.unit_from,
    unitTo: row.unit_to,
    url: row.url,
    remindMinutesBefore: row.remind_minutes_before,
    rolledOverCount: row.rolled_over_count,
    originalDay: row.original_day,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tag_list ? row.tag_list.split(',').filter(Boolean) : [],
    actualMinutes: Math.round((row.actual_seconds ?? 0) / 60)
  }
}

function query(sql: string, ...params: unknown[]): Task[] {
  return (getDb().prepare(sql).all(...params) as TaskRow[]).map(mapTask)
}

export function listDay(day: DayString): Task[] {
  return query(`${SELECT} WHERE t.day = ? ORDER BY t.sort_order`, day)
}

export function listRange(from: DayString, to: DayString): Task[] {
  return query(`${SELECT} WHERE t.day BETWEEN ? AND ? ORDER BY t.day, t.sort_order`, from, to)
}

/** Unfinished work from earlier days - the pile the morning check-in triages. */
export function listOpenBefore(day: DayString, limit = 200): Task[] {
  return query(
    `${SELECT} WHERE t.day < ? AND t.status IN ('todo', 'doing') ORDER BY t.day, t.sort_order LIMIT ?`,
    day,
    limit
  )
}

export function listOpenOn(day: DayString): Task[] {
  return query(`${SELECT} WHERE t.day = ? AND t.status IN ('todo', 'doing') ORDER BY t.sort_order`, day)
}

export function getTask(id: string): Task | null {
  const row = getDb().prepare(`${SELECT} WHERE t.id = ?`).get(id) as TaskRow | undefined
  return row ? mapTask(row) : null
}

export function tasksForMaterial(materialId: string): Task[] {
  return query(`${SELECT} WHERE t.material_id = ? ORDER BY t.day`, materialId)
}

export function tasksForGoal(goalId: string): Task[] {
  return query(`${SELECT} WHERE t.goal_id = ? ORDER BY t.day DESC, t.sort_order`, goalId)
}

export function countMit(day: DayString): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM tasks WHERE day = ? AND is_mit = 1 AND status <> 'dropped'")
    .get(day) as { n: number }
  return row.n
}

function nextSortOrder(db: Db, day: DayString): number {
  const row = db.prepare('SELECT MAX(sort_order) AS m FROM tasks WHERE day = ?').get(day) as {
    m: number | null
  }
  return (row.m ?? 0) + 1
}

function writeTags(db: Db, taskId: string, tags: string[]): void {
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId)
  const insert = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)')
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase()
    if (clean) insert.run(taskId, clean)
  }
}

export function createTask(draft: TaskDraft, now = Date.now()): Task {
  const db = getDb()
  const id = newId('t_')
  db.transaction(() => {
    db.prepare(
      `INSERT INTO tasks (id, title, notes, day, start_at, estimate_minutes, status, is_mit,
                          sort_order, goal_id, milestone_id, habit_id, material_id,
                          planned_units, unit_from, unit_to, url, remind_minutes_before,
                          original_day, created_at, updated_at)
       VALUES (@id, @title, @notes, @day, @startAt, @estimateMinutes, 'todo', @isMit,
               @sortOrder, @goalId, @milestoneId, @habitId, @materialId,
               @plannedUnits, @unitFrom, @unitTo, @url, @remindMinutesBefore,
               @day, @now, @now)`
    ).run({
      id,
      title: draft.title.trim(),
      notes: draft.notes ?? null,
      day: draft.day,
      startAt: draft.startAt ?? null,
      estimateMinutes: draft.estimateMinutes ?? null,
      isMit: draft.isMit ? 1 : 0,
      sortOrder: nextSortOrder(db, draft.day),
      goalId: draft.goalId ?? null,
      milestoneId: draft.milestoneId ?? null,
      habitId: draft.habitId ?? null,
      materialId: draft.materialId ?? null,
      plannedUnits: draft.plannedUnits ?? null,
      unitFrom: draft.unitFrom ?? null,
      unitTo: draft.unitTo ?? null,
      url: draft.url ?? null,
      remindMinutesBefore: draft.remindMinutesBefore ?? null,
      now
    })
    if (draft.tags?.length) writeTags(db, id, draft.tags)
  })()
  return getTask(id)!
}

const PATCH_COLUMNS: Record<string, string> = {
  title: 'title',
  notes: 'notes',
  day: 'day',
  startAt: 'start_at',
  estimateMinutes: 'estimate_minutes',
  status: 'status',
  notDoneReason: 'not_done_reason',
  isMit: 'is_mit',
  sortOrder: 'sort_order',
  goalId: 'goal_id',
  milestoneId: 'milestone_id',
  doneUnits: 'done_units',
  url: 'url',
  remindMinutesBefore: 'remind_minutes_before'
}

export function updateTask(id: string, patch: TaskPatch, now = Date.now()): Task {
  const db = getDb()
  db.transaction(() => {
    const assignments: string[] = []
    const values: Record<string, unknown> = { id, now }
    for (const [key, column] of Object.entries(PATCH_COLUMNS)) {
      const value = (patch as Record<string, unknown>)[key]
      if (value === undefined) continue
      assignments.push(`${column} = @${key}`)
      values[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value
    }
    if (assignments.length > 0) {
      db.prepare(`UPDATE tasks SET ${assignments.join(', ')}, updated_at = @now WHERE id = @id`).run(values)
    }
    if (patch.tags) writeTags(db, id, patch.tags)
  })()
  const task = getTask(id)
  if (!task) throw new Error(`Task ${id} no longer exists`)
  return task
}

export function setStatus(
  id: string,
  status: TaskStatus,
  reason: NotDoneReason | null = null,
  now = Date.now()
): Task {
  getDb()
    .prepare(
      `UPDATE tasks
       SET status = ?, not_done_reason = ?, completed_at = CASE WHEN ? = 'done' THEN ? ELSE NULL END,
           updated_at = ?
       WHERE id = ?`
    )
    .run(status, status === 'done' ? null : reason, status, now, now, id)
  const task = getTask(id)
  if (!task) throw new Error(`Task ${id} no longer exists`)
  return task
}

export class MitLimitError extends Error {
  constructor(limit: number) {
    super(`Only ${limit} tasks can be pinned as Focus for one day.`)
    this.name = 'MitLimitError'
  }
}

export function setMit(id: string, isMit: boolean, limit = 3): Task[] {
  const task = getTask(id)
  if (!task) throw new Error(`Task ${id} no longer exists`)
  if (isMit && !task.isMit && countMit(task.day) >= limit) throw new MitLimitError(limit)
  getDb()
    .prepare('UPDATE tasks SET is_mit = ?, updated_at = ? WHERE id = ?')
    .run(isMit ? 1 : 0, Date.now(), id)
  return listDay(task.day)
}

/**
 * Moves a task to another day, optionally in front of a specific sibling.
 * Rolling a task forward is recorded so repeatedly-postponed work can be
 * flagged instead of quietly living forever.
 */
export function moveTask(
  id: string,
  day: DayString,
  beforeTaskId: string | null = null,
  options: { countAsRollover?: boolean } = {}
): Task {
  const db = getDb()
  const existing = getTask(id)
  if (!existing) throw new Error(`Task ${id} no longer exists`)

  let sortOrder: number
  if (beforeTaskId) {
    const target = getTask(beforeTaskId)
    const previous = db
      .prepare('SELECT MAX(sort_order) AS m FROM tasks WHERE day = ? AND sort_order < ?')
      .get(day, target?.sortOrder ?? 0) as { m: number | null }
    sortOrder = ((previous.m ?? (target?.sortOrder ?? 1) - 2) + (target?.sortOrder ?? 1)) / 2
  } else {
    sortOrder = nextSortOrder(db, day)
  }

  const rollover = options.countAsRollover && day > existing.day
  // A rescheduled task keeps its time of day but lands on the new date.
  let startAt = existing.startAt
  if (startAt != null && day !== existing.day) {
    const original = new Date(startAt)
    const [y, m, d] = day.split('-').map(Number)
    startAt = new Date(y, m - 1, d, original.getHours(), original.getMinutes(), 0, 0).getTime()
  }

  db.prepare(
    `UPDATE tasks
     SET day = ?, sort_order = ?, start_at = ?,
         rolled_over_count = rolled_over_count + ?, updated_at = ?
     WHERE id = ?`
  ).run(day, sortOrder, startAt, rollover ? 1 : 0, Date.now(), id)
  return getTask(id)!
}

export function deleteTask(id: string): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function daySummary(day: DayString): DaySummary {
  const tasks = listDay(day)
  const pomodoros = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM time_entries
       WHERE kind = 'pomodoro' AND completed = 1 AND started_at BETWEEN ? AND ?`
    )
    .get(dayStart(day), dayEnd(day)) as { n: number }

  return {
    day,
    planned: tasks.filter((t) => t.status !== 'dropped').length,
    done: tasks.filter((t) => t.status === 'done').length,
    dropped: tasks.filter((t) => t.status === 'dropped').length,
    estimatedMinutes: tasks.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0),
    actualMinutes: tasks.reduce((sum, t) => sum + t.actualMinutes, 0),
    pomodoros: pomodoros.n
  }
}

function dayStart(day: DayString): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

function dayEnd(day: DayString): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

export { dayStart, dayEnd }
