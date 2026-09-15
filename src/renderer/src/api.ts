import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventChannel, EventContract } from '@shared/ipc'
import { DEFAULT_SETTINGS, type AppSettings, type CheckinStatusSummary, type TimerState } from '@shared/types'

export const api = window.api

export function useEvent<C extends EventChannel>(
  channel: C,
  handler: (payload: EventContract[C]) => void
): void {
  const saved = useRef(handler)
  saved.current = handler
  useEffect(() => api.on(channel, (payload) => saved.current(payload)), [channel])
}

/**
 * Loads data from main and reloads it whenever main says something changed, so
 * a task completed in the check-in window shows up in the main window without
 * either side knowing about the other.
 */
export function useLive<T>(
  loader: () => Promise<T>,
  initial: T,
  deps: unknown[] = []
): [T, () => void] {
  const [data, setData] = useState<T>(initial)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const reload = useCallback(() => {
    let cancelled = false
    void loaderRef.current().then((value) => {
      if (!cancelled) setData(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reload(), deps)
  useEvent('data:changed', () => reload())

  return [data, reload]
}

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => Promise<void>] {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    void api.invoke('settings:get').then(setSettings)
  }, [])
  useEvent('settings:changed', setSettings)

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings(await api.invoke('settings:update', patch))
  }, [])

  return [settings, update]
}

const IDLE_TIMER: TimerState = {
  phase: 'idle',
  mode: 'pomodoro',
  taskId: null,
  taskTitle: null,
  elapsedSeconds: 0,
  remainingSeconds: null,
  completedSessions: 0
}

export function useTimer(): TimerState {
  const [state, setState] = useState<TimerState>(IDLE_TIMER)
  useEffect(() => {
    void api.invoke('timer:state').then(setState)
  }, [])
  useEvent('timer:state', setState)
  return state
}

export function useCheckinStatus(): CheckinStatusSummary {
  const [status, setStatus] = useState<CheckinStatusSummary>({
    pending: null,
    open: false,
    streak: 0,
    snoozesLeft: 0
  })
  useEffect(() => {
    void api.invoke('checkin:status').then(setStatus)
  }, [])
  useEvent('checkin:state', setStatus)
  useEvent('data:changed', () => void api.invoke('checkin:status').then(setStatus))
  return status
}

/* ------------------------------------------------------------------ toasts */

type ToastListener = (message: string, kind: 'info' | 'error') => void
const toastListeners = new Set<ToastListener>()

export function showToast(message: string, kind: 'info' | 'error' = 'info'): void {
  for (const listener of toastListeners) listener(message, kind)
}

/** Surfaces a rejected IPC call instead of letting it vanish into the console. */
export function report(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  showToast(message.replace(/^Error invoking remote method '[^']+':\s*/, ''), 'error')
}

export function useToasts(): { message: string; kind: 'info' | 'error' } | null {
  const [toast, setToast] = useState<{ message: string; kind: 'info' | 'error' } | null>(null)

  useEffect(() => {
    const listener: ToastListener = (message, kind) => setToast({ message, kind })
    toastListeners.add(listener)
    return () => {
      toastListeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  return toast
}
