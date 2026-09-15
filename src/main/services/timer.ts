import type { TimerMode, TimerState } from '@shared/types'
import { formatMinutes } from '@shared/time'
import * as taskRepo from '../db/repos/tasks'
import * as entryRepo from '../db/repos/timeEntries'
import { getSettings } from '../db/repos/settings'
import { broadcast } from '../windows'
import { notifySessionEnd } from './notifications'

/**
 * The timer lives in the main process so it keeps running with every window
 * closed - the whole point of the menu bar countdown.
 */
interface Internal {
  phase: TimerState['phase']
  mode: TimerMode
  taskId: string | null
  taskTitle: string | null
  entryId: string | null
  /** when the current run of the session began; null while paused */
  runningSince: number | null
  accumulatedMs: number
  targetSeconds: number | null
  completedSessions: number
  /** remembers whether a paused session was a break, so resume returns to it */
  pausedFromBreak: boolean
}

const state: Internal = {
  phase: 'idle',
  mode: 'pomodoro',
  taskId: null,
  taskTitle: null,
  entryId: null,
  runningSince: null,
  accumulatedMs: 0,
  targetSeconds: null,
  completedSessions: 0,
  pausedFromBreak: false
}

let ticker: NodeJS.Timeout | null = null
const listeners = new Set<(state: TimerState) => void>()

function elapsedSeconds(now = Date.now()): number {
  const running = state.runningSince == null ? 0 : now - state.runningSince
  return Math.floor((state.accumulatedMs + running) / 1000)
}

export function getState(): TimerState {
  const elapsed = elapsedSeconds()
  return {
    phase: state.phase,
    mode: state.mode,
    taskId: state.taskId,
    taskTitle: state.taskTitle,
    elapsedSeconds: elapsed,
    remainingSeconds: state.targetSeconds == null ? null : Math.max(0, state.targetSeconds - elapsed),
    completedSessions: state.completedSessions
  }
}

export function onTimerChange(listener: (state: TimerState) => void): void {
  listeners.add(listener)
}

function publish(): void {
  const snapshot = getState()
  broadcast('timer:state', snapshot)
  for (const listener of listeners) listener(snapshot)
}

function startTicking(): void {
  if (ticker) return
  ticker = setInterval(() => {
    if (state.targetSeconds != null && elapsedSeconds() >= state.targetSeconds) {
      completeSession()
      return
    }
    publish()
  }, 1000)
}

function stopTicking(): void {
  if (!ticker) return
  clearInterval(ticker)
  ticker = null
}

function reset(): void {
  state.phase = 'idle'
  state.taskId = null
  state.taskTitle = null
  state.entryId = null
  state.runningSince = null
  state.accumulatedMs = 0
  state.targetSeconds = null
  state.pausedFromBreak = false
  stopTicking()
}

export function start(taskId: string | null, mode: TimerMode): TimerState {
  if (state.phase !== 'idle') stop()

  const settings = getSettings()
  const task = taskId ? taskRepo.getTask(taskId) : null
  state.phase = 'running'
  state.mode = mode
  state.taskId = task?.id ?? null
  state.taskTitle = task?.title ?? null
  state.runningSince = Date.now()
  state.accumulatedMs = 0
  state.targetSeconds = mode === 'pomodoro' ? settings.pomodoroMinutes * 60 : null
  state.entryId = entryRepo.startEntry(state.taskId, mode === 'pomodoro' ? 'pomodoro' : 'free').id

  if (task && task.status === 'todo') taskRepo.setStatus(task.id, 'doing')

  startTicking()
  publish()
  return getState()
}

export function pause(): TimerState {
  if (state.phase !== 'running' && state.phase !== 'break') return getState()
  if (state.runningSince != null) {
    state.accumulatedMs += Date.now() - state.runningSince
    state.runningSince = null
  }
  state.pausedFromBreak = state.phase === 'break'
  state.phase = 'paused'
  stopTicking()
  publish()
  return getState()
}

export function resume(): TimerState {
  if (state.phase !== 'paused') return getState()
  state.runningSince = Date.now()
  state.phase = state.pausedFromBreak ? 'break' : 'running'
  startTicking()
  publish()
  return getState()
}

export function stop(): TimerState {
  if (state.entryId) entryRepo.finishEntry(state.entryId, false)
  reset()
  publish()
  return getState()
}

/** Ends a pomodoro or a break that reached its target. */
function completeSession(): void {
  const wasBreak = state.phase === 'break'
  if (state.entryId) entryRepo.finishEntry(state.entryId, true)

  const settings = getSettings()
  if (wasBreak) {
    const title = state.taskTitle
    reset()
    publish()
    notifySessionEnd('Break over', title ? `Back to: ${title}` : 'Ready when you are')
    return
  }

  state.completedSessions += 1
  const longBreak = state.completedSessions % Math.max(1, settings.longBreakEvery) === 0
  const breakMinutes = longBreak ? settings.longBreakMinutes : settings.shortBreakMinutes

  notifySessionEnd(
    'Pomodoro done',
    `${state.taskTitle ?? 'Session'} · ${formatMinutes(breakMinutes)} break`
  )

  if (state.mode !== 'pomodoro' || breakMinutes <= 0) {
    reset()
    publish()
    return
  }

  state.phase = 'break'
  state.runningSince = Date.now()
  state.accumulatedMs = 0
  state.targetSeconds = breakMinutes * 60
  state.entryId = entryRepo.startEntry(state.taskId, 'break').id
  startTicking()
  publish()
}

export function skipBreak(): TimerState {
  if (state.phase !== 'break') return getState()
  if (state.entryId) entryRepo.finishEntry(state.entryId, false)
  reset()
  publish()
  return getState()
}

/** Called at boot so a crash mid-session cannot inflate tomorrow's totals. */
export function recoverFromCrash(): void {
  entryRepo.closeDanglingEntries()
}
