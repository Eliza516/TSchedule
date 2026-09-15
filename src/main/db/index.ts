import Database from 'better-sqlite3'
import { MIGRATIONS } from './migrations'

export type Db = Database.Database

let instance: Db | null = null

/** Opens (or creates) the database and brings it up to the current schema. */
export function initDatabase(file: string): Db {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  instance = db
  return db
}

export function runMigrations(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    const sql = MIGRATIONS[version]
    db.transaction(() => {
      db.exec(sql)
      db.pragma(`user_version = ${version + 1}`)
    })()
  }
}

export function getDb(): Db {
  if (!instance) throw new Error('Database has not been initialised yet')
  return instance
}

export function closeDatabase(): void {
  instance?.close()
  instance = null
}

/** Short, sortable, collision-free enough for a single-user local app. */
export function newId(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}${random}`
}

export function boolToInt(value: boolean): number {
  return value ? 1 : 0
}

export function intToBool(value: number | null | undefined): boolean {
  return value === 1
}
