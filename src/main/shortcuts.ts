import { globalShortcut } from 'electron'
import type { AppSettings } from '@shared/types'
import * as checkins from './services/checkins'
import { toggleCaptureWindow } from './windows'

export interface ShortcutStatus {
  capture: boolean
  wrapUp: boolean
}

let status: ShortcutStatus = { capture: false, wrapUp: false }

/**
 * Registers the global hotkeys. macOS silently refuses an accelerator another
 * app already owns, so the outcome is kept and surfaced in Settings rather than
 * leaving the user wondering why nothing happens.
 */
export function registerShortcuts(settings: AppSettings): ShortcutStatus {
  globalShortcut.unregisterAll()
  status = {
    capture: register(settings.captureShortcut, toggleCaptureWindow),
    wrapUp: register(settings.wrapUpShortcut, () => checkins.openManual())
  }
  return status
}

function register(accelerator: string, handler: () => void): boolean {
  if (!accelerator) return false
  try {
    return globalShortcut.register(accelerator, handler)
  } catch {
    return false
  }
}

export function getShortcutStatus(): ShortcutStatus {
  return status
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
