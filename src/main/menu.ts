import { Menu, app, shell } from 'electron'
import * as checkins from './services/checkins'
import { showMainWindow, toggleCaptureWindow } from './windows'

/**
 * A trimmed-down application menu. The default Electron menu works, but the
 * two commands this app is built around deserve first-class keyboard access.
 */
export function buildAppMenu(shortcuts: { capture: string; wrapUp: string }): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Day',
      submenu: [
        {
          label: 'Wrap up my day',
          accelerator: shortcuts.wrapUp,
          click: (): void => checkins.openManual()
        },
        {
          label: 'Quick capture',
          accelerator: shortcuts.capture,
          click: (): void => toggleCaptureWindow()
        },
        { type: 'separator' },
        { label: 'Open TSchedule', click: (): void => showMainWindow() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'TSchedule on GitHub',
          click: (): Promise<void> => shell.openExternal('https://github.com/Eliza516/TSchedule')
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
