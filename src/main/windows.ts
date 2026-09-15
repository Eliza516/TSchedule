import { join } from 'node:path'
import { BrowserWindow, app, shell } from 'electron'
import type { EventChannel, EventContract } from '@shared/ipc'
import type { NotificationRoute, Strictness } from '@shared/types'

type Page = 'index' | 'checkin' | 'capture'

let mainWindow: BrowserWindow | null = null
let checkinWindow: BrowserWindow | null = null
let captureWindow: BrowserWindow | null = null
let strictness: Strictness = 'medium'
/** Route handed to the main window as soon as it is ready to receive it. */
let pendingRoute: NotificationRoute | null = null

const preload = join(__dirname, '../preload/index.js')

function loadPage(window: BrowserWindow, page: Page): void {
  const devServer = process.env.ELECTRON_RENDERER_URL
  if (devServer) {
    void window.loadURL(`${devServer}/${page === 'index' ? 'index' : page}.html`)
  } else {
    void window.loadFile(join(__dirname, `../renderer/${page}.html`))
  }
}

export function setStrictness(value: Strictness): void {
  strictness = value
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow

  const window = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 880,
    minHeight: 600,
    show: false,
    title: 'TSchedule',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 16 },
    backgroundColor: '#f6f6f4',
    webPreferences: { preload, sandbox: false, contextIsolation: true }
  })

  window.on('ready-to-show', () => {
    window.show()
    if (pendingRoute) {
      window.webContents.send('navigate', pendingRoute)
      pendingRoute = null
    }
  })

  // A check-in that is open owns the screen until it is dealt with.
  window.on('focus', () => {
    if (strictness !== 'soft' && checkinWindow && !checkinWindow.isDestroyed()) {
      checkinWindow.show()
      checkinWindow.focus()
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.on('closed', () => {
    mainWindow = null
  })

  loadPage(window, 'index')
  mainWindow = window
  return window
}

export function showMainWindow(route: NotificationRoute | null = null): void {
  const window = createMainWindow()
  if (route) {
    if (window.webContents.isLoading()) pendingRoute = route
    else window.webContents.send('navigate', route)
  }
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
}

/**
 * The check-in window. Deliberately awkward to dismiss: no close button, no
 * Escape, and it pulls focus back if the user clicks away. It is a strong nudge
 * rather than an OS-level lock - force-quitting still works, and no userspace
 * macOS app can do better than that.
 */
export function createCheckinWindow(): BrowserWindow {
  if (checkinWindow && !checkinWindow.isDestroyed()) return checkinWindow

  const window = new BrowserWindow({
    width: 820,
    height: 720,
    minWidth: 640,
    minHeight: 520,
    show: false,
    frame: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    backgroundColor: '#f6f6f4',
    title: 'Check in',
    webPreferences: { preload, sandbox: false, contextIsolation: true }
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  window.on('ready-to-show', () => {
    window.show()
    window.focus()
  })

  window.on('closed', () => {
    checkinWindow = null
  })

  loadPage(window, 'checkin')
  checkinWindow = window
  return window
}

export function getCheckinWindow(): BrowserWindow | null {
  return checkinWindow && !checkinWindow.isDestroyed() ? checkinWindow : null
}

export function closeCheckinWindow(): void {
  if (!checkinWindow || checkinWindow.isDestroyed()) return
  const window = checkinWindow
  checkinWindow = null
  window.destroy()
}

/** A single-line capture box, kept alive and hidden so it opens instantly. */
export function createCaptureWindow(): BrowserWindow {
  if (captureWindow && !captureWindow.isDestroyed()) return captureWindow

  const window = new BrowserWindow({
    width: 680,
    height: 132,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: { preload, sandbox: false, contextIsolation: true }
  })

  window.setAlwaysOnTop(true, 'floating')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  window.on('blur', () => window.hide())
  window.on('closed', () => {
    captureWindow = null
  })

  loadPage(window, 'capture')
  captureWindow = window
  return window
}

export function toggleCaptureWindow(): void {
  const window = createCaptureWindow()
  if (window.isVisible()) {
    window.hide()
    return
  }
  window.center()
  window.show()
  window.focus()
  window.webContents.send('navigate', { view: 'inbox' })
}

export function hideCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) captureWindow.hide()
}

/** Pushes an event to every open window; windows ignore what they don't use. */
export function broadcast<C extends EventChannel>(channel: C, payload: EventContract[C]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send(channel, payload)
  }
}

export function applyDockVisibility(hidden: boolean): void {
  if (process.platform !== 'darwin' || !app.dock) return
  if (hidden) void app.dock.hide()
  else void app.dock.show()
}
