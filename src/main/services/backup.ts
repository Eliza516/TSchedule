import { writeFileSync, readFileSync } from 'node:fs'
import { dialog } from 'electron'
import { toDayString } from '@shared/time'
import { getDb } from '../db'

const TABLES = [
  'settings',
  'goals',
  'milestones',
  'habits',
  'habit_logs',
  'tasks',
  'task_tags',
  'reminders',
  'time_entries',
  'checkins',
  'daily_notes',
  'inbox_items'
] as const

interface Backup {
  format: 'tschedule-backup'
  version: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

function snapshot(): Backup {
  const db = getDb()
  const tables: Record<string, unknown[]> = {}
  for (const table of TABLES) tables[table] = db.prepare(`SELECT * FROM ${table}`).all()
  return {
    format: 'tschedule-backup',
    version: db.pragma('user_version', { simple: true }) as number,
    exportedAt: new Date().toISOString(),
    tables
  }
}

/** Everything, as one JSON file the user can keep anywhere they like. */
export async function exportBackup(): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export TSchedule data',
    defaultPath: `tschedule-${toDayString(Date.now())}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return null
  writeFileSync(filePath, JSON.stringify(snapshot(), null, 2), 'utf8')
  return filePath
}

/** A readable journal: one section per day, with its tasks and reflections. */
export async function exportMarkdown(): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export journal as Markdown',
    defaultPath: `tschedule-journal-${toDayString(Date.now())}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (canceled || !filePath) return null

  const db = getDb()
  const days = (
    db
      .prepare(
        `SELECT day FROM (SELECT day FROM tasks UNION SELECT day FROM daily_notes) ORDER BY day DESC`
      )
      .all() as { day: string }[]
  ).map((r) => r.day)

  const lines: string[] = ['# TSchedule journal', '']
  for (const day of days) {
    lines.push(`## ${day}`, '')
    const tasks = db
      .prepare('SELECT title, status, estimate_minutes, not_done_reason FROM tasks WHERE day = ? ORDER BY sort_order')
      .all(day) as { title: string; status: string; estimate_minutes: number | null; not_done_reason: string | null }[]
    for (const task of tasks) {
      const box = task.status === 'done' ? 'x' : ' '
      const estimate = task.estimate_minutes ? ` _(est. ${task.estimate_minutes}m)_` : ''
      const reason = task.not_done_reason ? ` — ${task.not_done_reason.replace(/_/g, ' ')}` : ''
      lines.push(`- [${box}] ${task.title}${estimate}${reason}`)
    }
    const note = db.prepare('SELECT * FROM daily_notes WHERE day = ?').get(day) as
      | { went_well_md: string | null; blocked_md: string | null; tomorrow_priority: string | null }
      | undefined
    if (note?.went_well_md) lines.push('', `**Went well:** ${note.went_well_md}`)
    if (note?.blocked_md) lines.push('', `**Blocked by:** ${note.blocked_md}`)
    if (note?.tomorrow_priority) lines.push('', `**Next priority:** ${note.tomorrow_priority}`)
    lines.push('')
  }

  writeFileSync(filePath, lines.join('\n'), 'utf8')
  return filePath
}

/**
 * Replaces the current contents with a backup. Destructive by nature, so the
 * user has to confirm after picking the file, and the whole thing runs in one
 * transaction - a malformed backup leaves the existing data untouched.
 */
export async function importBackup(): Promise<boolean> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import TSchedule data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return false

  const parsed = JSON.parse(readFileSync(filePaths[0], 'utf8')) as Backup
  if (parsed.format !== 'tschedule-backup') throw new Error('That file is not a TSchedule backup.')

  const confirmed = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Replace everything', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'Replace all TSchedule data?',
    detail: `This wipes the current database and restores the backup from ${new Date(
      parsed.exportedAt
    ).toLocaleString()}. It cannot be undone.`
  })
  if (confirmed.response !== 0) return false

  const db = getDb()
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      for (const table of [...TABLES].reverse()) db.prepare(`DELETE FROM ${table}`).run()
      for (const table of TABLES) {
        const rows = (parsed.tables[table] ?? []) as Record<string, unknown>[]
        if (rows.length === 0) continue
        const columns = Object.keys(rows[0])
        const statement = db.prepare(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`
        )
        for (const row of rows) statement.run(row)
      }
    })()
  } finally {
    db.pragma('foreign_keys = ON')
  }
  return true
}
