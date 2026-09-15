import type { DailyNote, DayString } from '@shared/types'
import { getDb } from '../index'

interface Row {
  day: string
  morning_plan_md: string | null
  went_well_md: string | null
  blocked_md: string | null
  tomorrow_priority: string | null
  mood: number | null
  energy: number | null
  updated_at: number
}

function mapNote(row: Row): DailyNote {
  return {
    day: row.day,
    morningPlanMd: row.morning_plan_md,
    wentWellMd: row.went_well_md,
    blockedMd: row.blocked_md,
    tomorrowPriority: row.tomorrow_priority,
    mood: row.mood,
    energy: row.energy,
    updatedAt: row.updated_at
  }
}

export function getNote(day: DayString): DailyNote | null {
  const row = getDb().prepare('SELECT * FROM daily_notes WHERE day = ?').get(day) as Row | undefined
  return row ? mapNote(row) : null
}

const COLUMNS: Record<string, string> = {
  morningPlanMd: 'morning_plan_md',
  wentWellMd: 'went_well_md',
  blockedMd: 'blocked_md',
  tomorrowPriority: 'tomorrow_priority',
  mood: 'mood',
  energy: 'energy'
}

export function saveNote(
  day: DayString,
  patch: Partial<Omit<DailyNote, 'day' | 'updatedAt'>>,
  now = Date.now()
): DailyNote {
  const db = getDb()
  db.prepare('INSERT INTO daily_notes (day, updated_at) VALUES (?, ?) ON CONFLICT(day) DO NOTHING').run(
    day,
    now
  )
  const assignments: string[] = []
  const values: Record<string, unknown> = { day, now }
  for (const [key, column] of Object.entries(COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key]
    if (value === undefined) continue
    assignments.push(`${column} = @${key}`)
    values[key] = value
  }
  if (assignments.length > 0) {
    db.prepare(`UPDATE daily_notes SET ${assignments.join(', ')}, updated_at = @now WHERE day = @day`).run(
      values
    )
  }
  return getNote(day)!
}
