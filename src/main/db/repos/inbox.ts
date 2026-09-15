import type { InboxItem } from '@shared/types'
import { getDb, newId } from '../index'

interface Row {
  id: string
  text: string
  created_at: number
  processed_at: number | null
}

function mapItem(row: Row): InboxItem {
  return { id: row.id, text: row.text, createdAt: row.created_at, processedAt: row.processed_at }
}

export function listInbox(): InboxItem[] {
  return (
    getDb()
      .prepare('SELECT * FROM inbox_items WHERE processed_at IS NULL ORDER BY created_at DESC')
      .all() as Row[]
  ).map(mapItem)
}

export function addInboxItem(text: string, now = Date.now()): InboxItem {
  const id = newId('i_')
  getDb()
    .prepare('INSERT INTO inbox_items (id, text, created_at) VALUES (?, ?, ?)')
    .run(id, text.trim(), now)
  return { id, text: text.trim(), createdAt: now, processedAt: null }
}

export function markProcessed(id: string, now = Date.now()): void {
  getDb().prepare('UPDATE inbox_items SET processed_at = ? WHERE id = ?').run(now, id)
}

export function deleteInboxItem(id: string): void {
  getDb().prepare('DELETE FROM inbox_items WHERE id = ?').run(id)
}
