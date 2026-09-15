import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'
import { getDb } from '../index'

/** Settings are stored one JSON value per key and layered over the defaults. */
export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  const stored: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      stored[row.key] = JSON.parse(row.value)
    } catch {
      // A corrupted value falls back to the default rather than breaking boot.
    }
  }
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<AppSettings>) }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const db = getDb()
  const write = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  db.transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue
      write.run(key, JSON.stringify(value))
    }
  })()
  return getSettings()
}
