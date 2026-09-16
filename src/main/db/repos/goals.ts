import type {
  DayString,
  Goal,
  GoalDraft,
  GoalProgress,
  GoalWithProgress,
  Milestone,
  MilestoneDraft
} from '@shared/types'
import { daysBetween } from '@shared/time'
import { goalProgressRatio } from '@shared/stats'
import { getDb, newId } from '../index'
import { goalUnits } from './materials'

interface GoalRow {
  id: string
  title: string
  notes_md: string | null
  target_date: string | null
  status: string
  color: string | null
  created_at: number
  updated_at: number
}

interface MilestoneRow {
  id: string
  goal_id: string
  title: string
  due_date: string | null
  done_at: number | null
  sort_order: number
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    notesMd: row.notes_md,
    targetDate: row.target_date,
    status: row.status as Goal['status'],
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    dueDate: row.due_date,
    doneAt: row.done_at,
    sortOrder: row.sort_order
  }
}

export function listMilestones(goalId: string): Milestone[] {
  return (
    getDb().prepare('SELECT * FROM milestones WHERE goal_id = ? ORDER BY sort_order').all(goalId) as
      MilestoneRow[]
  ).map(mapMilestone)
}

/**
 * Progress blends milestones and linked day-to-day tasks, so a goal that is
 * only broken into milestones and one that is only worked through daily tasks
 * both report something sensible.
 */
export function goalProgress(
  goal: Goal,
  milestones: Milestone[],
  today: DayString,
  neglectedAfterDays: number
): GoalProgress {
  const db = getDb()
  const taskCounts = db
    .prepare(
      `SELECT
         COUNT(*) FILTER (WHERE status <> 'dropped') AS total,
         COUNT(*) FILTER (WHERE status = 'done')     AS done,
         MAX(CASE WHEN status = 'done' THEN day END) AS last_day
       FROM tasks WHERE goal_id = ?`
    )
    .get(goal.id) as { total: number | null; done: number | null; last_day: string | null }

  const logged = db
    .prepare(
      `SELECT COALESCE(SUM(e.duration_seconds), 0) AS seconds
       FROM time_entries e JOIN tasks t ON t.id = e.task_id
       WHERE t.goal_id = ? AND e.kind <> 'break'`
    )
    .get(goal.id) as { seconds: number }

  const units = goalUnits(goal.id)
  const milestonesDone = milestones.filter((m) => m.doneAt != null).length
  const tasksDone = taskCounts.done ?? 0
  const tasksTotal = taskCounts.total ?? 0
  const lastProgressDay = taskCounts.last_day
  const daysSince = lastProgressDay ? Math.max(0, daysBetween(lastProgressDay, today)) : null
  const idleDays = daysSince ?? Math.max(0, daysBetween(dayOf(goal.createdAt), today))

  return {
    goalId: goal.id,
    progress: goalProgressRatio({
      milestonesDone,
      milestonesTotal: milestones.length,
      tasksDone,
      tasksTotal,
      unitsDone: units.done,
      unitsTotal: units.total
    }),
    milestonesDone,
    milestonesTotal: milestones.length,
    tasksDone,
    tasksTotal,
    minutesLogged: Math.round(logged.seconds / 60),
    daysLeft: goal.targetDate ? daysBetween(today, goal.targetDate) : null,
    lastProgressDay,
    daysSinceProgress: daysSince,
    neglected: goal.status === 'active' && idleDays >= neglectedAfterDays
  }
}

function dayOf(instant: number): DayString {
  const d = new Date(instant)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function listGoals(today: DayString, neglectedAfterDays: number): GoalWithProgress[] {
  const goals = (
    getDb()
      .prepare(
        `SELECT * FROM goals
         ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END,
                  target_date IS NULL, target_date, created_at`
      )
      .all() as GoalRow[]
  ).map(mapGoal)

  return goals.map((goal) => {
    const milestones = listMilestones(goal.id)
    return { ...goal, milestones, progress: goalProgress(goal, milestones, today, neglectedAfterDays) }
  })
}

export function getGoal(
  id: string,
  today: DayString,
  neglectedAfterDays: number
): GoalWithProgress | null {
  const row = getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined
  if (!row) return null
  const goal = mapGoal(row)
  const milestones = listMilestones(id)
  return { ...goal, milestones, progress: goalProgress(goal, milestones, today, neglectedAfterDays) }
}

export function getGoalPlain(id: string): Goal | null {
  const row = getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined
  return row ? mapGoal(row) : null
}

export function createGoal(draft: GoalDraft, now = Date.now()): Goal {
  const id = newId('g_')
  getDb()
    .prepare(
      `INSERT INTO goals (id, title, notes_md, target_date, status, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
    )
    .run(id, draft.title.trim(), draft.notesMd ?? null, draft.targetDate ?? null, draft.color ?? null, now, now)
  return getGoalPlain(id)!
}

export function updateGoal(
  id: string,
  patch: Partial<GoalDraft> & { status?: Goal['status'] },
  now = Date.now()
): Goal {
  const columns: Record<string, string> = {
    title: 'title',
    notesMd: 'notes_md',
    targetDate: 'target_date',
    color: 'color',
    status: 'status'
  }
  const assignments: string[] = []
  const values: Record<string, unknown> = { id, now }
  for (const [key, column] of Object.entries(columns)) {
    const value = (patch as Record<string, unknown>)[key]
    if (value === undefined) continue
    assignments.push(`${column} = @${key}`)
    values[key] = value
  }
  if (assignments.length > 0) {
    getDb()
      .prepare(`UPDATE goals SET ${assignments.join(', ')}, updated_at = @now WHERE id = @id`)
      .run(values)
  }
  const goal = getGoalPlain(id)
  if (!goal) throw new Error(`Goal ${id} no longer exists`)
  return goal
}

export function deleteGoal(id: string): void {
  getDb().prepare('DELETE FROM goals WHERE id = ?').run(id)
}

export function createMilestone(draft: MilestoneDraft): Milestone {
  const db = getDb()
  const id = newId('m_')
  const next = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM milestones WHERE goal_id = ?')
    .get(draft.goalId) as { n: number }
  db.prepare(
    'INSERT INTO milestones (id, goal_id, title, due_date, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(id, draft.goalId, draft.title.trim(), draft.dueDate ?? null, next.n)
  return getMilestone(id)!
}

export function getMilestone(id: string): Milestone | null {
  const row = getDb().prepare('SELECT * FROM milestones WHERE id = ?').get(id) as
    | MilestoneRow
    | undefined
  return row ? mapMilestone(row) : null
}

export function updateMilestone(
  id: string,
  patch: Partial<Omit<Milestone, 'id' | 'goalId'>>
): Milestone {
  const columns: Record<string, string> = {
    title: 'title',
    dueDate: 'due_date',
    doneAt: 'done_at',
    sortOrder: 'sort_order'
  }
  const assignments: string[] = []
  const values: Record<string, unknown> = { id }
  for (const [key, column] of Object.entries(columns)) {
    const value = (patch as Record<string, unknown>)[key]
    if (value === undefined) continue
    assignments.push(`${column} = @${key}`)
    values[key] = value
  }
  if (assignments.length > 0) {
    getDb().prepare(`UPDATE milestones SET ${assignments.join(', ')} WHERE id = @id`).run(values)
  }
  const milestone = getMilestone(id)
  if (!milestone) throw new Error(`Milestone ${id} no longer exists`)
  return milestone
}

export function toggleMilestone(id: string, now = Date.now()): Milestone {
  const current = getMilestone(id)
  if (!current) throw new Error(`Milestone ${id} no longer exists`)
  return updateMilestone(id, { doneAt: current.doneAt ? null : now })
}

export function deleteMilestone(id: string): void {
  getDb().prepare('DELETE FROM milestones WHERE id = ?').run(id)
}

/** Milestones due on or before `day` that are still open - worth a nudge. */
export function dueMilestones(day: DayString): (Milestone & { goalTitle: string })[] {
  return (
    getDb()
      .prepare(
        `SELECT m.*, g.title AS goal_title FROM milestones m
         JOIN goals g ON g.id = m.goal_id
         WHERE m.done_at IS NULL AND m.due_date IS NOT NULL AND m.due_date <= ?
           AND g.status = 'active'
         ORDER BY m.due_date`
      )
      .all(day) as (MilestoneRow & { goal_title: string })[]
  ).map((row) => ({ ...mapMilestone(row), goalTitle: row.goal_title }))
}
