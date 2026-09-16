import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { closeDatabase, initDatabase, runMigrations, type Db } from '../src/main/db'
import { MIGRATIONS } from '../src/main/db/migrations'
import * as tasks from '../src/main/db/repos/tasks'
import * as goals from '../src/main/db/repos/goals'
import * as materials from '../src/main/db/repos/materials'
import * as checkins from '../src/main/db/repos/checkins'
import * as reminders from '../src/main/db/repos/reminders'
import * as settings from '../src/main/db/repos/settings'
import * as timeEntries from '../src/main/db/repos/timeEntries'
import { MINUTE_MS } from '@shared/time'

const TODAY = '2026-03-10'
const YESTERDAY = '2026-03-09'

beforeEach(() => {
  closeDatabase()
  initDatabase(':memory:')
})

describe('migrations', () => {
  it('bring a fresh database up to the current schema', () => {
    const rows = initDatabase(':memory:')
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[]
    const names = rows.map((r) => r.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'checkins',
        'daily_notes',
        'goals',
        'habit_logs',
        'habits',
        'inbox_items',
        'milestones',
        'reminders',
        'settings',
        'task_tags',
        'tasks',
        'time_entries'
      ])
    )
  })
})

describe('settings', () => {
  it('layer stored values over the defaults', () => {
    expect(settings.getSettings().eveningCheckinTime).toBe('23:30')
    const updated = settings.updateSettings({ eveningCheckinTime: '22:00' })
    expect(updated.eveningCheckinTime).toBe('22:00')
    expect(updated.morningWindowStart).toBe('06:00')
  })
})

describe('tasks', () => {
  it('round-trips a task with tags and reads back logged time', () => {
    const task = tasks.createTask({
      title: 'Write report',
      day: TODAY,
      estimateMinutes: 45,
      tags: ['work', 'Deep']
    })
    expect(task.tags).toEqual(['deep', 'work'])
    expect(task.actualMinutes).toBe(0)
    expect(task.originalDay).toBe(TODAY)

    timeEntries.logManualMinutes(task.id, 68, TODAY)
    expect(tasks.getTask(task.id)!.actualMinutes).toBe(68)
  })

  it('caps Focus tasks at three per day', () => {
    const made = ['a', 'b', 'c', 'd'].map((title) => tasks.createTask({ title, day: TODAY }))
    for (const task of made.slice(0, 3)) tasks.setMit(task.id, true)
    expect(() => tasks.setMit(made[3].id, true)).toThrow(tasks.MitLimitError)
    expect(tasks.countMit(TODAY)).toBe(3)
  })

  it('records a rollover and keeps the original day when work is pushed forward', () => {
    const task = tasks.createTask({ title: 'Slipping', day: YESTERDAY })
    const moved = tasks.moveTask(task.id, TODAY, null, { countAsRollover: true })
    expect(moved.day).toBe(TODAY)
    expect(moved.rolledOverCount).toBe(1)
    expect(moved.originalDay).toBe(YESTERDAY)
  })

  it('keeps the time of day when a scheduled task is moved', () => {
    const at14 = new Date(2026, 2, 9, 14, 0, 0).getTime()
    const task = tasks.createTask({ title: 'Call', day: YESTERDAY, startAt: at14 })
    const moved = tasks.moveTask(task.id, TODAY)
    expect(new Date(moved.startAt!).getHours()).toBe(14)
    expect(new Date(moved.startAt!).getDate()).toBe(10)
  })

  it('clears the not-done reason when a task is finally completed', () => {
    const task = tasks.createTask({ title: 'Later', day: TODAY })
    tasks.setStatus(task.id, 'todo', 'blocked')
    expect(tasks.getTask(task.id)!.notDoneReason).toBe('blocked')
    const done = tasks.setStatus(task.id, 'done')
    expect(done.notDoneReason).toBeNull()
    expect(done.completedAt).not.toBeNull()
  })

  it('lists only unfinished work from earlier days as carry-over', () => {
    tasks.createTask({ title: 'Old open', day: YESTERDAY })
    const finished = tasks.createTask({ title: 'Old done', day: YESTERDAY })
    tasks.setStatus(finished.id, 'done')
    tasks.createTask({ title: 'Today open', day: TODAY })

    const carry = tasks.listOpenBefore(TODAY)
    expect(carry.map((t) => t.title)).toEqual(['Old open'])
  })

  it('summarises a day', () => {
    const a = tasks.createTask({ title: 'A', day: TODAY, estimateMinutes: 30 })
    const b = tasks.createTask({ title: 'B', day: TODAY, estimateMinutes: 60 })
    tasks.setStatus(a.id, 'done')
    tasks.setStatus(b.id, 'dropped', 'not_important')
    timeEntries.logManualMinutes(a.id, 40, TODAY)

    const summary = tasks.daySummary(TODAY)
    expect(summary).toMatchObject({ planned: 1, done: 1, dropped: 1, estimatedMinutes: 90, actualMinutes: 40 })
  })
})

describe('reminders', () => {
  const now = new Date(2026, 2, 10, 9, 0, 0).getTime()

  it('queues a lead and a start reminder for a scheduled task', () => {
    const task = tasks.createTask({ title: 'Standup', day: TODAY, startAt: now + 60 * MINUTE_MS })
    reminders.syncForTask(task, 10, now)
    const due = reminders.dueReminders(now + 61 * MINUTE_MS)
    expect(due.map((r) => r.kind).sort()).toEqual(['lead', 'start'])
    expect(due[0].fireAt).toBe(now + 50 * MINUTE_MS)
  })

  it('queues nothing for an untimed or finished task', () => {
    const anytime = tasks.createTask({ title: 'Anytime', day: TODAY })
    reminders.syncForTask(anytime, 10, now)
    const done = tasks.createTask({ title: 'Done', day: TODAY, startAt: now + MINUTE_MS })
    reminders.syncForTask(tasks.setStatus(done.id, 'done'), 10, now)
    expect(reminders.dueReminders(now + 10 * MINUTE_MS)).toHaveLength(0)
  })

  it('does not fire the same reminder twice', () => {
    const task = tasks.createTask({ title: 'Once', day: TODAY, startAt: now + 5 * MINUTE_MS })
    reminders.syncForTask(task, 0, now)
    const due = reminders.dueReminders(now + 6 * MINUTE_MS)
    expect(due).toHaveLength(1)
    reminders.markFired(due.map((r) => r.id))
    expect(reminders.dueReminders(now + 6 * MINUTE_MS)).toHaveLength(0)
  })

  it('drops pending reminders when the task is rescheduled', () => {
    const task = tasks.createTask({ title: 'Moves', day: TODAY, startAt: now + 30 * MINUTE_MS })
    reminders.syncForTask(task, 10, now)
    const moved = tasks.updateTask(task.id, { startAt: now + 120 * MINUTE_MS })
    reminders.syncForTask(moved, 10, now)
    const due = reminders.dueReminders(now + 200 * MINUTE_MS)
    expect(due.every((r) => r.fireAt >= now + 110 * MINUTE_MS)).toBe(true)
    expect(due).toHaveLength(2)
  })
})

describe('owed evening check-ins', () => {
  it('flags a day the user worked on but never closed out', () => {
    tasks.createTask({ title: 'Worked on this', day: YESTERDAY })
    expect(checkins.owedEveningDays(TODAY)).toEqual([YESTERDAY])
  })

  it('clears once the day has been closed out', () => {
    tasks.createTask({ title: 'Worked on this', day: YESTERDAY })
    checkins.markCompleted(YESTERDAY, 'evening')
    expect(checkins.owedEveningDays(TODAY)).toEqual([])
  })

  it('ignores days with no activity at all', () => {
    tasks.createTask({ title: 'Only today', day: TODAY })
    expect(checkins.owedEveningDays(TODAY)).toEqual([])
  })

  it('does not reach further back than the lookback window', () => {
    tasks.createTask({ title: 'Ancient', day: '2026-01-01' })
    expect(checkins.owedEveningDays(TODAY)).toEqual([])
  })

  it('counts a snooze without losing the pending state', () => {
    const row = checkins.snooze(TODAY, 'morning', Date.now() + 10 * MINUTE_MS)
    expect(row.snoozeCount).toBe(1)
    expect(row.status).toBe('pending')
    expect(checkins.snooze(TODAY, 'morning', Date.now()).snoozeCount).toBe(2)
  })
})

describe('goals', () => {
  it('counts down to the target date and blends milestone and task progress', () => {
    const goal = goals.createGoal({ title: 'Final exam', targetDate: '2026-04-26' })
    goals.createMilestone({ goalId: goal.id, title: 'Finish chapter 1' })
    const second = goals.createMilestone({ goalId: goal.id, title: 'Finish chapter 2' })
    goals.toggleMilestone(second.id)

    const done = tasks.createTask({ title: 'Revise', day: TODAY, goalId: goal.id })
    tasks.setStatus(done.id, 'done')
    tasks.createTask({ title: 'Practice paper', day: TODAY, goalId: goal.id })

    const loaded = goals.getGoal(goal.id, TODAY, 7)!
    expect(loaded.progress.daysLeft).toBe(47)
    expect(loaded.progress.milestonesDone).toBe(1)
    expect(loaded.progress.tasksDone).toBe(1)
    expect(loaded.progress.progress).toBeCloseTo(0.5)
    expect(loaded.progress.neglected).toBe(false)
  })

  it('flags a goal that has had no progress for a while', () => {
    const goal = goals.createGoal({ title: 'Stalled' })
    const old = tasks.createTask({ title: 'Long ago', day: '2026-02-01', goalId: goal.id })
    tasks.setStatus(old.id, 'done')
    expect(goals.getGoal(goal.id, TODAY, 7)!.progress.neglected).toBe(true)
  })

  it('unlinks tasks rather than deleting them when a goal goes away', () => {
    const goal = goals.createGoal({ title: 'Doomed' })
    const task = tasks.createTask({ title: 'Survivor', day: TODAY, goalId: goal.id })
    goals.deleteGoal(goal.id)
    expect(tasks.getTask(task.id)!.goalId).toBeNull()
  })
})

describe('materials', () => {
  function addBook(): string {
    return materials.createMaterial({
      kind: 'book',
      title: 'Clean Code',
      filePath: '/books/clean-code.pdf',
      unitKind: 'page',
      totalUnits: 60,
      weekdays: [0, 1, 2, 3, 4],
      studyTime: '20:00',
      targetDate: '2026-03-20',
      sections: [
        { title: 'Ch.1', startUnit: 1, endUnit: 30 },
        { title: 'Ch.2', startUnit: 31, endUnit: 60 }
      ]
    }).id
  }

  it('round-trips a material and its table of contents', () => {
    const id = addBook()
    const material = materials.getMaterial(id)!
    expect(material.kind).toBe('book')
    expect(material.weekdays).toEqual([0, 1, 2, 3, 4])
    expect(material.active).toBe(true)
    expect(materials.listSections(id).map((s) => s.title)).toEqual(['Ch.1', 'Ch.2'])
  })

  it('replaces the whole table of contents rather than merging it', () => {
    const id = addBook()
    materials.replaceSections(id, [{ title: 'Only one', startUnit: 1, endUnit: 60 }])
    expect(materials.listSections(id)).toHaveLength(1)
  })

  it('falls back to the goal deadline when the material has none of its own', () => {
    const goal = goals.createGoal({ title: 'Exam', targetDate: '2026-06-01' })
    const id = materials.createMaterial({
      goalId: goal.id,
      kind: 'course',
      title: 'ML',
      unitKind: 'lesson',
      totalUnits: 10,
      weekdays: [0, 1, 2, 3, 4]
    }).id
    expect(materials.getMaterial(id)!.targetDate).toBe('2026-06-01')
  })

  it('counts progress from the tasks that were ticked off', () => {
    const id = addBook()
    const task = tasks.createTask({
      title: 'Clean Code — trang 1–6',
      day: TODAY,
      materialId: id,
      plannedUnits: 6,
      unitFrom: 1,
      unitTo: 6,
      url: null
    })
    expect(materials.unitsDone(id)).toBe(0)
    tasks.updateTask(task.id, { doneUnits: 6 })
    expect(materials.unitsDone(id)).toBe(6)
    expect(tasks.getTask(task.id)!.plannedUnits).toBe(6)
    expect(tasks.getTask(task.id)!.unitTo).toBe(6)
  })

  it('only admits file paths it is actually holding', () => {
    addBook()
    expect(materials.hasFilePath('/books/clean-code.pdf')).toBe(true)
    expect(materials.hasFilePath('/etc/passwd')).toBe(false)
  })

  it('keeps a task when its material is deleted, just unlinked', () => {
    const id = addBook()
    const task = tasks.createTask({ title: 'Read', day: TODAY, materialId: id })
    materials.deleteMaterial(id)
    expect(tasks.getTask(task.id)!.materialId).toBeNull()
  })
})

describe('upgrading an existing database', () => {
  /** A database as it was before study materials existed, with real data in it. */
  function openVersionOne(): Db {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(MIGRATIONS[0])
    db.pragma('user_version = 1')
    db.prepare(
      `INSERT INTO goals (id, title, status, created_at, updated_at) VALUES ('g1', 'Exam', 'active', 1, 1)`
    ).run()
    db.prepare(
      `INSERT INTO tasks (id, title, day, status, is_mit, sort_order, goal_id, rolled_over_count, created_at, updated_at)
       VALUES ('t1', 'Revise chapter 4', '2026-03-09', 'done', 0, 1, 'g1', 0, 1, 1)`
    ).run()
    return db
  }

  it('brings it up to date without touching what is already there', () => {
    const db = openVersionOne()
    runMigrations(db)

    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length)
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t1') as Record<string, unknown>
    expect(task.title).toBe('Revise chapter 4')
    expect(task.goal_id).toBe('g1')
    // The new columns exist and are empty, which is what "not a study task" means.
    expect(task.material_id).toBeNull()
    expect(task.done_units).toBeNull()
    expect(task.url).toBeNull()
  })

  it('is safe to run again on an already-current database', () => {
    const db = openVersionOne()
    runMigrations(db)
    runMigrations(db)
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length)
    expect(db.prepare('SELECT COUNT(*) AS n FROM tasks').get()).toEqual({ n: 1 })
  })
})
