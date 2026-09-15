import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'
import { getDb } from '../index'

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]

/** Settings are stored one JSON value per key and layered over the defaults. */
export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  const settings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (!SETTING_KEYS.includes(row.key as keyof AppSettings)) continue
    try {
      ;(settings as Record<string, unknown>)[row.key] = JSON.parse(row.value)
    } catch {
      // A corrupted value falls back to the default rather than breaking boot.
    }
  }
  return settings
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const db = getDb()
  const write = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  db.transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue
      if (!SETTING_KEYS.includes(key as keyof AppSettings)) continue
      write.run(key, JSON.stringify(value))
    }
  })()
  return getSettings()
}

/**
 * Bookkeeping the app keeps for itself - last nudge day, last seen day and so
 * on. Namespaced so it can never collide with a user-facing setting.
 */
export function getMeta(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(`meta:${key}`) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(`meta:${key}`, value)
}
