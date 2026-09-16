import { powerMonitor, shell } from 'electron'
import type { DayString, Task } from '@shared/types'
import { MINUTE_MS, minutesOfDay, parseHhMm, toDayString } from '@shared/time'
import * as reminderRepo from '../db/repos/reminders'
import * as taskRepo from '../db/repos/tasks'
import * as goalRepo from '../db/repos/goals'
import * as materialRepo from '../db/repos/materials'
import { getMeta, getSettings, setMeta } from '../db/repos/settings'
import * as checkins from './checkins'
import * as dailyRun from './dailyRun'
import * as timer from './timer'
import { notifyMilestoneDue, notifyNeglectedGoal, notifyTaskLead, notifyTaskStart } from './notifications'

/**
 * One 15-second heartbeat drives everything time-based.
 *
 * Long `setTimeout`s are deliberately avoided: they drift badly across sleep,
 * and a MacBook lid is closed far more often than it is shut down. Polling the
 * database instead means waking up is enough to catch up.
 */
const TICK_MS = 15_000
/** A reminder this far past its moment is stale - the machine was asleep. */
const STALE_REMINDER_MS = 30 * MINUTE_MS
const NUDGE_AFTER_MINUTES = 12 * 60

let ticker: NodeJS.Timeout | null = null
let lastSeenDay: DayString | null = null

export function start(): void {
  timer.recoverFromCrash()
  lastSeenDay = toDayString(Date.now())
  dailyRun.ensureRanForDay(lastSeenDay)

  ticker = setInterval(() => tick('tick'), TICK_MS)

  // Waking the machine is the moment the morning check-in is meant to catch.
  powerMonitor.on('resume', () => tick('resume'))
  powerMonitor.on('unlock-screen', () => tick('unlock'))
  powerMonitor.on('user-did-become-active', () => tick('activate'))

  tick('launch')
}

export function stop(): void {
  if (ticker) clearInterval(ticker)
  ticker = null
}

export function tick(trigger: 'tick' | 'launch' | 'resume' | 'unlock' | 'activate'): void {
  const now = Date.now()
  const day = toDayString(now)

  if (day !== lastSeenDay) {
    lastSeenDay = day
    dailyRun.ensureRanForDay(day)
  }

  fireDueReminders(now)
  runDailyNudges(now, day)

  // The evening check-in has its own moment; everything else rides the trigger
  // that woke us up.
  const settings = getSettings()
  const eveningMinutes = parseHhMm(settings.eveningCheckinTime) ?? 23 * 60 + 30
  const scheduled = trigger === 'tick' && minutesOfDay(now) >= eveningMinutes
  checkins.evaluate(scheduled ? 'schedule' : trigger, now)
}

function fireDueReminders(now: number): void {
  const due = reminderRepo.dueReminders(now)
  if (due.length === 0) return

  // Mark everything before showing anything: a crash mid-loop must not turn
  // into a second round of the same notifications.
  reminderRepo.markFired(due.map((r) => r.id), now)

  const settings = getSettings()
  for (const reminder of due) {
    if (now - reminder.fireAt > STALE_REMINDER_MS) continue
    const task = taskRepo.getTask(reminder.taskId)
    if (!task || task.status === 'done' || task.status === 'dropped') continue

    if (reminder.kind === 'lead') {
      notifyTaskLead(task, task.remindMinutesBefore ?? settings.defaultRemindMinutesBefore)
    } else {
      notifyTaskStart(task, {
        onStartTimer: () => timer.start(task.id, 'pomodoro'),
        onOpen: openerFor(task)
      })
    }
  }
}

/** What "start now" means for a task: its own link, or its material's file. */
function openerFor(task: Task): (() => void) | null {
  if (task.url) {
    const url = task.url
    return () => void shell.openExternal(url)
  }
  const filePath = task.materialId ? materialRepo.getMaterial(task.materialId)?.filePath : null
  if (filePath) return () => void shell.openPath(filePath)
  return null
}

/**
 * Goal and milestone nudges, once a day from midday. The morning check-in shows
 * the same information on screen; this is the backstop for a day where it was
 * clicked through quickly.
 */
function runDailyNudges(now: number, day: DayString): void {
  if (minutesOfDay(now) < NUDGE_AFTER_MINUTES) return
  if (getMeta('lastNudgeDay') === day) return
  setMeta('lastNudgeDay', day)

  const settings = getSettings()
  for (const milestone of goalRepo.dueMilestones(day).slice(0, 3)) {
    notifyMilestoneDue(milestone)
  }

  const neglected = goalRepo
    .listGoals(day, settings.neglectedGoalDays)
    .filter((goal) => goal.status === 'active' && goal.progress.neglected)
    .sort((a, b) => (a.progress.daysLeft ?? 9999) - (b.progress.daysLeft ?? 9999))
    .slice(0, 2)

  for (const goal of neglected) {
    notifyNeglectedGoal(
      goal.title,
      goal.progress.daysSinceProgress ?? settings.neglectedGoalDays,
      goal.progress.daysLeft
    )
  }
}
