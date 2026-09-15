import { join } from 'node:path'
import { Menu, Tray, app, nativeImage } from 'electron'
import type { TimerState } from '@shared/types'
import { formatClock, formatMinutes, toDayString } from '@shared/time'
import * as taskRepo from './db/repos/tasks'
import * as checkins from './services/checkins'
import * as timer from './services/timer'
import { showMainWindow, toggleCaptureWindow } from './windows'

let tray: Tray | null = null

function iconPath(): string {
  // Packaged builds keep resources next to the app; dev runs from the repo.
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'resources', 'trayTemplate.png')
}

export function createTray(): Tray {
  if (tray) return tray

  const image = nativeImage.createFromPath(iconPath())
  image.setTemplateImage(true)
  tray = new Tray(image)
  tray.setToolTip('TSchedule')
  refreshTray()
  return tray
}

/**
 * The menu bar is the app's face while the window is closed: it carries the
 * running countdown, what is coming up next, and the way to close out the day.
 */
export function refreshTray(state: TimerState = timer.getState()): void {
  if (!tray) return

  const day = toDayString(Date.now())
  const status = checkins.status()
  const upcoming = taskRepo
    .listOpenOn(day)
    .sort((a, b) => (a.startAt ?? Infinity) - (b.startAt ?? Infinity))
    .slice(0, 3)

  tray.setTitle(trayTitle(state, status.pending != null))

  const menu = Menu.buildFromTemplate([
    ...(status.pending
      ? [
          {
            label: status.pending.overdue
              ? `Close out ${status.pending.day}`
              : `${status.pending.kind === 'morning' ? 'Plan' : 'Wrap up'} today`,
            click: (): void => void checkins.evaluate('manual')
          },
          { type: 'separator' as const }
        ]
      : []),
    ...(upcoming.length > 0
      ? [
          { label: 'Up next', enabled: false },
          ...upcoming.map((task) => ({
            label: `   ${task.startAt ? `${new Date(task.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  ` : ''}${task.title}${
              task.estimateMinutes ? `  (${formatMinutes(task.estimateMinutes)})` : ''
            }`,
            click: (): void => showMainWindow({ view: 'today', taskId: task.id, day })
          })),
          { type: 'separator' as const }
        ]
      : []),
    ...timerMenuItems(state),
    { type: 'separator' },
    { label: 'Quick capture', click: (): void => toggleCaptureWindow() },
    { label: 'Wrap up my day', click: (): void => checkins.openManual() },
    { type: 'separator' },
    { label: 'Open TSchedule', click: (): void => showMainWindow() },
    { label: 'Quit TSchedule', click: (): void => app.quit() }
  ])

  tray.setContextMenu(menu)
}

function trayTitle(state: TimerState, checkinPending: boolean): string {
  if (state.phase === 'running' || state.phase === 'break') {
    const seconds = state.remainingSeconds ?? state.elapsedSeconds
    return `${state.phase === 'break' ? '☕ ' : ''}${formatClock(seconds)}`
  }
  if (state.phase === 'paused') return '❙❙'
  return checkinPending ? '•' : ''
}

function timerMenuItems(state: TimerState): Electron.MenuItemConstructorOptions[] {
  if (state.phase === 'idle') {
    return [{ label: 'No timer running', enabled: false }]
  }
  const label = state.taskTitle ?? (state.phase === 'break' ? 'Break' : 'Focus session')
  return [
    { label: `${label} — ${formatClock(state.remainingSeconds ?? state.elapsedSeconds)}`, enabled: false },
    state.phase === 'paused'
      ? { label: 'Resume', click: (): void => void timer.resume() }
      : { label: 'Pause', click: (): void => void timer.pause() },
    state.phase === 'break'
      ? { label: 'Skip break', click: (): void => void timer.skipBreak() }
      : { label: 'Stop', click: (): void => void timer.stop() }
  ]
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
