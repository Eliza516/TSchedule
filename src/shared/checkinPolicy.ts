import type {
  AppSettings,
  CheckinDecision,
  CheckinKind,
  CheckinRow,
  CheckinTrigger,
  DayString,
  Instant
} from './types'
import { minutesOfDay, parseHhMm } from './time'

/**
 * Decides which check-in - if any - must be shown right now.
 *
 * This is the heart of the "force me to close out my day" behaviour, so it is a
 * pure function: give it the clock, the stored rows and the settings, and it
 * answers the same way every time. Nothing here touches Electron or the DB,
 * which is what makes the 23:30 / sleep / quit interactions testable.
 */

export interface CheckinPolicyInput {
  now: Instant
  today: DayString
  /**
   * Days before `today` that the user was active on and never closed out,
   * oldest first. Derived from real activity (tasks, notes, logged time) rather
   * than from a marker written at sleep time, so a crash, a force-quit or a
   * flat battery still leaves the debt standing.
   */
  owedEveningDays: DayString[]
  rows: CheckinRow[]
  trigger: CheckinTrigger
  settings: Pick<
    AppSettings,
    'morningWindowStart' | 'eveningWindowStart' | 'eveningCheckinTime' | 'maxSnoozes'
  >
}

function findRow(rows: CheckinRow[], day: DayString, kind: CheckinKind): CheckinRow | undefined {
  return rows.find((r) => r.day === day && r.kind === kind)
}

function isCompleted(rows: CheckinRow[], day: DayString, kind: CheckinKind): boolean {
  return findRow(rows, day, kind)?.status === 'completed'
}

/** A snooze holds the check-in back until it expires - unless snoozes ran out. */
function isSnoozed(row: CheckinRow | undefined, now: Instant, maxSnoozes: number): boolean {
  if (!row || row.snoozedUntil == null) return false
  if (row.snoozeCount > maxSnoozes) return false
  return row.snoozedUntil > now
}

export function snoozesLeft(row: CheckinRow | undefined, maxSnoozes: number): number {
  return Math.max(0, maxSnoozes - (row?.snoozeCount ?? 0))
}

/** Triggers that mean the user is sitting in front of the machine right now. */
const PRESENCE_TRIGGERS: CheckinTrigger[] = ['launch', 'resume', 'unlock', 'activate', 'tick', 'schedule']

export function resolvePendingCheckin(input: CheckinPolicyInput): CheckinDecision | null {
  const { now, today, owedEveningDays, rows, trigger, settings } = input
  const nowMinutes = minutesOfDay(now)
  const morningStart = parseHhMm(settings.morningWindowStart) ?? 6 * 60
  const eveningStart = parseHhMm(settings.eveningWindowStart) ?? 18 * 60
  const eveningTime = parseHhMm(settings.eveningCheckinTime) ?? 23 * 60 + 30
  const { maxSnoozes } = settings

  // Explicit "Wrap up my day" always wins, at any hour, snooze or not.
  if (trigger === 'manual') {
    return { kind: 'evening', day: today, trigger, overdue: false }
  }

  const candidates: CheckinDecision[] = []

  // 1. Days that were never closed out. Oldest first, so a backlog is worked
  //    through in order rather than skipping to the most recent.
  for (const day of owedEveningDays) {
    if (day >= today) continue
    candidates.push({ kind: 'evening', day, trigger, overdue: true })
  }

  // 2. This morning's planning session - only inside the morning window. Past
  //    the evening cut-off a "plan your day" prompt is just noise.
  if (nowMinutes >= morningStart && nowMinutes < eveningStart) {
    candidates.push({ kind: 'morning', day: today, trigger, overdue: false })
  }

  // 3. Tonight's wrap-up: at the scheduled time, or earlier if the user is
  //    quitting the app after the evening window has opened.
  const quittingAfterHours = trigger === 'quit' && nowMinutes >= eveningStart
  if (nowMinutes >= eveningTime || quittingAfterHours) {
    candidates.push({ kind: 'evening', day: today, trigger, overdue: false })
  }

  if (!PRESENCE_TRIGGERS.includes(trigger) && trigger !== 'quit') return null

  for (const candidate of candidates) {
    if (isCompleted(rows, candidate.day, candidate.kind)) continue
    if (isSnoozed(findRow(rows, candidate.day, candidate.kind), now, maxSnoozes)) continue
    return candidate
  }
  return null
}

/**
 * Whether quitting should be held back to force a wrap-up first. Only ever true
 * once per evening - a completed or snoozed-out check-in lets the app quit.
 */
export function shouldBlockQuit(input: Omit<CheckinPolicyInput, 'trigger'>): CheckinDecision | null {
  const decision = resolvePendingCheckin({ ...input, trigger: 'quit' })
  return decision && decision.kind === 'evening' ? decision : null
}

/** Consecutive days, counting back from `today`, with a completed check-in. */
export function checkinStreak(rows: CheckinRow[], today: DayString, kind: CheckinKind = 'evening'): number {
  const completed = new Set(
    rows.filter((r) => r.kind === kind && r.status === 'completed').map((r) => r.day)
  )
  let streak = 0
  const cursor = new Date(`${today}T00:00:00`)
  // Today not being closed out yet does not break yesterday's streak.
  if (!completed.has(today)) cursor.setDate(cursor.getDate() - 1)
  for (;;) {
    const day = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
      cursor.getDate()
    ).padStart(2, '0')}`
    if (!completed.has(day)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
