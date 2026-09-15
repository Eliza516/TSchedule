import { join } from 'node:path'
import { app } from 'electron'
import { initDatabase } from './db'
import { getSettings } from './db/repos/settings'
import { applySettingsSideEffects, registerIpc } from './ipc'
import { buildAppMenu } from './menu'
import * as checkins from './services/checkins'
import * as scheduler from './services/scheduler'
import * as timer from './services/timer'
import { createTray, refreshTray } from './tray'
import { createCaptureWindow, createMainWindow, showMainWindow } from './windows'

// Named before anything else so macOS notifications are attributed to the app
// rather than to "Electron". In an unpackaged dev run macOS still shows
// "Electron" - that is a signing limitation, not a bug in the app.
app.setName('TSchedule')

// Closing the window must never stop the app: the whole point is that the
// check-ins and reminders keep working while it is out of sight.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())
  void app.whenReady().then(start)
}

function start(): void {
  initDatabase(join(app.getPath('userData'), 'tschedule.db'))

  const settings = getSettings()
  registerIpc()
  applySettingsSideEffects(settings)
  buildAppMenu({ capture: settings.captureShortcut, wrapUp: settings.wrapUpShortcut })

  createTray()
  timer.onTimerChange((state) => refreshTray(state))

  createMainWindow()
  // Kept warm and hidden so the capture hotkey feels instant.
  createCaptureWindow()

  scheduler.start()
  refreshTray()

  app.on('activate', () => {
    showMainWindow()
    checkins.evaluate('activate')
  })
}

app.on('window-all-closed', () => {
  // Deliberately does not quit - the app lives in the menu bar.
})

/**
 * Quitting after the evening window has opened is held back once so the day
 * gets closed out first. Completing the check-in calls app.quit() again, and by
 * then the policy has nothing left to ask for, so the second attempt goes
 * through.
 */
app.on('before-quit', (event) => {
  if (checkins.interceptQuit()) {
    event.preventDefault()
    return
  }
  scheduler.stop()
  timer.stop()
})
