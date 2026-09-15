import { app } from 'electron'
import type {
  CheckinDecision,
  CheckinPayload,
  CheckinStatusSummary,
  CheckinTrigger,
  DayString,
  EveningSubmission,
  MorningSubmission,
  TriageDecision
} from '@shared/types'
import { addDays, MINUTE_MS, toDayString } from '@shared/time'
import { checkinStreak, resolvePendingCheckin, snoozesLeft } from '@shared/checkinPolicy'
import * as checkinRepo from '../db/repos/checkins'
import * as taskRepo from '../db/repos/tasks'
import * as goalRepo from '../db/repos/goals'
import * as noteRepo from '../db/repos/notes'
import { getSettings } from '../db/repos/settings'
import * as taskService from './taskService'
import {
  broadcast,
  closeCheckinWindow,
  createCheckinWindow,
  getCheckinWindow,
  setStrictness
} from '../windows'

/**
 * Drives the morning and evening check-ins.
 *
 * The decision of *whether* to show one lives in shared/checkinPolicy as a pure
 * function; this module supplies it with real data, opens the window, and
 * applies whatever the user decided.
 */

let current: CheckinDecision | null = null
/** Set while a quit is being held back until the day is closed out. */
let quitAfterCheckin = false

function today(): DayString {
  return toDayString(Date.now())
}

export function isOpen(): boolean {
  return current != null && getCheckinWindow() != null
}

export function currentDecision(): CheckinDecision | null {
  return current
}

function decide(trigger: CheckinTrigger, now = Date.now()): CheckinDecision | null {
  const settings = getSettings()
  const day = toDayString(now)
  return resolvePendingCheckin({
    now,
    today: day,
    owedEveningDays: checkinRepo.owedEveningDays(day),
    rows: checkinRepo.listRows(addDays(day, -14)),
    trigger,
    settings
  })
}

/**
 * Called from every trigger layer: app launch, wake from sleep, screen unlock,
 * the 15s tick, the scheduled evening time, an attempted quit, and the manual
 * "Wrap up my day" command.
 */
export function evaluate(trigger: CheckinTrigger, now = Date.now()): boolean {
  if (isOpen()) return true
  const decision = decide(trigger, now)
  if (!decision) return false
  open(decision)
  return true
}

function open(decision: CheckinDecision): void {
  current = decision
  checkinRepo.markOpened(decision.day, decision.kind, decision.trigger)
  setStrictness(getSettings().strictness)
  createCheckinWindow()
  publishStatus()
}

export function openManual(): void {
  const decision = decide('manual')
  if (decision) open(decision)
}

export function status(): CheckinStatusSummary {
  const settings = getSettings()
  const day = today()
  const rows = checkinRepo.listRows(addDays(day, -60))
  const pending = current ?? decide('tick')
  const row = pending ? rows.find((r) => r.day === pending.day && r.kind === pending.kind) : undefined
  return {
    pending,
    open: isOpen(),
    streak: checkinStreak(rows, day),
    snoozesLeft: snoozesLeft(row, settings.maxSnoozes)
  }
}

export function publishStatus(): void {
  broadcast('checkin:state', status())
}

/** Everything the check-in window renders, assembled in one go. */
export function buildPayload(): CheckinPayload | null {
  if (!current) return null
  const settings = getSettings()
  const day = today()
  const decision = current
  const noteDay = decision.kind === 'morning' ? day : decision.day

  const carryOver =
    decision.kind === 'morning' ? taskRepo.listOpenBefore(day, 60) : taskRepo.listOpenBefore(decision.day, 60)
  const dayTasks = taskRepo.listDay(decision.kind === 'morning' ? day : decision.day)

  return {
    kind: decision.kind,
    day: decision.day,
    overdue: decision.overdue,
    today: day,
    snoozeCount: checkinRepo.getRow(decision.day, decision.kind)?.snoozeCount ?? 0,
    maxSnoozes: settings.maxSnoozes,
    snoozeMinutes: settings.snoozeMinutes,
    strictness: settings.strictness,
    requireEstimates: settings.requireEstimates,
    workdayHours: settings.workdayHours,
    carryOver,
    dayTasks,
    note: noteRepo.getNote(noteDay),
    previousPriority: noteRepo.getNote(addDays(noteDay, -1))?.tomorrowPriority ?? null,
    goals: goalRepo.listGoals(day, settings.neglectedGoalDays),
    streak: checkinStreak(checkinRepo.listRows(addDays(day, -60)), day),
    summary: taskRepo.daySummary(decision.kind === 'morning' ? day : decision.day)
  }
}

/**
 * Applies the per-task decisions the user was forced to make. Every unfinished
 * task must get one, which is what stops work quietly piling up unseen.
 */
function applyTriage(decisions: TriageDecision[], contextDay: DayString): void {
  const tomorrow = addDays(contextDay, 1)
  for (const decision of decisions) {
    const reason = decision.reason ?? null
    switch (decision.action) {
      case 'done':
        taskService.setStatus(decision.taskId, 'done', null, { silent: true })
        break
      case 'drop':
        taskService.setStatus(decision.taskId, 'dropped', reason, { silent: true })
        break
      case 'move_today':
        taskService.setStatus(decision.taskId, 'todo', reason, { silent: true })
        taskService.moveTask(decision.taskId, contextDay, null, { countAsRollover: true, silent: true })
        break
      case 'move_tomorrow':
        taskService.setStatus(decision.taskId, 'todo', reason, { silent: true })
        taskService.moveTask(decision.taskId, tomorrow, null, { countAsRollover: true, silent: true })
        break
      case 'pick_date':
        taskService.setStatus(decision.taskId, 'todo', reason, { silent: true })
        if (decision.day) {
          taskService.moveTask(decision.taskId, decision.day, null, {
            countAsRollover: true,
            silent: true
          })
        }
        break
      case 'keep':
        taskService.setStatus(decision.taskId, 'todo', reason, { silent: true })
        break
    }
    if (decision.actualMinutes && decision.actualMinutes > 0) {
      taskService.recordManualMinutes(decision.taskId, decision.actualMinutes, contextDay)
    }
  }
}

export function submitMorning(submission: MorningSubmission): void {
  const day = submission.day
  applyTriage(submission.triage, day)

  // Focus is a deliberate choice for the day, so it is rewritten wholesale.
  for (const task of taskRepo.listDay(day)) {
    const shouldBeMit = submission.mitTaskIds.includes(task.id)
    if (task.isMit !== shouldBeMit) taskRepo.updateTask(task.id, { isMit: shouldBeMit })
  }

  if (submission.planMd != null) noteRepo.saveNote(day, { morningPlanMd: submission.planMd })
  checkinRepo.markCompleted(day, 'morning')
  finish()
}

export function submitEvening(submission: EveningSubmission): void {
  const day = submission.day
  applyTriage(submission.triage, day)

  noteRepo.saveNote(day, {
    wentWellMd: submission.wentWellMd,
    blockedMd: submission.blockedMd,
    tomorrowPriority: submission.tomorrowPriority,
    mood: submission.mood,
    energy: submission.energy
  })

  // Tomorrow's stated priority becomes a real, pinned task rather than a note
  // the user has to remember to act on.
  const priority = submission.tomorrowPriority?.trim()
  if (priority) {
    const tomorrow = addDays(day, 1)
    const alreadyThere = taskRepo
      .listDay(tomorrow)
      .some((task) => task.title.toLowerCase() === priority.toLowerCase())
    if (!alreadyThere && taskRepo.countMit(tomorrow) < 3) {
      taskService.createTask({ title: priority, day: tomorrow, isMit: true }, { silent: true })
    }
  }

  checkinRepo.markCompleted(day, 'evening')
  finish()
}

function finish(): void {
  current = null
  closeCheckinWindow()
  broadcast('data:changed', { scope: 'all' })
  publishStatus()
  if (quitAfterCheckin) {
    quitAfterCheckin = false
    // Let the renderer settle before tearing the app down.
    setTimeout(() => app.quit(), 150)
  }
}

export function snooze(): void {
  if (!current) return
  const settings = getSettings()
  const row = checkinRepo.getRow(current.day, current.kind)
  if (snoozesLeft(row, settings.maxSnoozes) <= 0) return

  checkinRepo.snooze(current.day, current.kind, Date.now() + settings.snoozeMinutes * MINUTE_MS)
  current = null
  quitAfterCheckin = false
  closeCheckinWindow()
  publishStatus()
}

/**
 * Hook for `before-quit`: returns true when the quit was swallowed and a
 * check-in opened instead. Only ever holds a quit back once per evening.
 */
export function interceptQuit(): boolean {
  if (isOpen()) return true
  const decision = decide('quit')
  if (!decision || decision.kind !== 'evening') return false
  quitAfterCheckin = true
  open(decision)
  return true
}

export function cancelQuitIntent(): void {
  quitAfterCheckin = false
}
