import type {
  DayString,
  Material,
  MaterialDraft,
  MaterialPatch,
  MaterialSection,
  MaterialSectionDraft,
  MaterialWithPace
} from '@shared/types'
import { paceFor } from '@shared/studyPlan'
import { getDb, intToBool, newId, type Db } from '../index'

interface MaterialRow {
  id: string
  goal_id: string | null
  kind: string
  title: string
  url: string | null
  file_path: string | null
  unit_kind: string
  total_units: number
  units_done_before: number
  minutes_per_unit: number | null
  weekdays_json: string
  study_time: string | null
  max_units_per_day: number | null
  target_date: string | null
  /** filled in by the SELECT below, not a column of `materials` */
  goal_target_date?: string | null
  active: number
  created_at: number
  updated_at: number
}

interface SectionRow {
  id: string
  material_id: string
  title: string
  start_unit: number
  end_unit: number
  sort_order: number
}

/**
 * A material without its own deadline inherits the goal's, so "finish before
 * the exam" only has to be said once.
 */
const SELECT = `
  SELECT m.*, (SELECT g.target_date FROM goals g WHERE g.id = m.goal_id) AS goal_target_date
  FROM materials m`

function parseWeekdays(json: string): number[] {
  try {
    const parsed = JSON.parse(json) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    }
  } catch {
    // fall through to the safe default
  }
  return [0, 1, 2, 3, 4, 5, 6]
}

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    goalId: row.goal_id,
    kind: row.kind as Material['kind'],
    title: row.title,
    url: row.url,
    filePath: row.file_path,
    unitKind: row.unit_kind as Material['unitKind'],
    totalUnits: row.total_units,
    unitsDoneBefore: row.units_done_before,
    minutesPerUnit: row.minutes_per_unit,
    weekdays: parseWeekdays(row.weekdays_json),
    studyTime: row.study_time,
    maxUnitsPerDay: row.max_units_per_day,
    targetDate: row.target_date ?? row.goal_target_date ?? null,
    active: intToBool(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapSection(row: SectionRow): MaterialSection {
  return {
    id: row.id,
    materialId: row.material_id,
    title: row.title,
    startUnit: row.start_unit,
    endUnit: row.end_unit,
    sortOrder: row.sort_order
  }
}

export function listSections(materialId: string): MaterialSection[] {
  return (
    getDb()
      .prepare('SELECT * FROM material_sections WHERE material_id = ? ORDER BY sort_order')
      .all(materialId) as SectionRow[]
  ).map(mapSection)
}

/** Rewrites the whole table of contents: it is edited as one list, not row by row. */
export function replaceSections(
  materialId: string,
  sections: MaterialSectionDraft[]
): MaterialSection[] {
  const db = getDb()
  db.transaction(() => {
    db.prepare('DELETE FROM material_sections WHERE material_id = ?').run(materialId)
    const insert = db.prepare(
      `INSERT INTO material_sections (id, material_id, title, start_unit, end_unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    sections.forEach((section, index) => {
      const title = section.title.trim()
      if (!title) return
      insert.run(newId('s_'), materialId, title, section.startUnit, section.endUnit, index + 1)
    })
  })()
  return listSections(materialId)
}

/** How far the user actually got, summed from the tasks they ticked off. */
export function unitsDone(materialId: string): number {
  const row = getDb()
    .prepare('SELECT COALESCE(SUM(done_units), 0) AS n FROM tasks WHERE material_id = ?')
    .get(materialId) as { n: number }
  return row.n
}

export function withPace(material: Material, today: DayString): MaterialWithPace {
  const done = unitsDone(material.id)
  return {
    ...material,
    sections: listSections(material.id),
    unitsDone: done,
    pace: paceFor(material, done, today)
  }
}

export function listMaterials(options: { activeOnly?: boolean } = {}): Material[] {
  const where = options.activeOnly ? 'WHERE m.active = 1' : ''
  return (
    getDb().prepare(`${SELECT} ${where} ORDER BY m.created_at`).all() as MaterialRow[]
  ).map(mapMaterial)
}

export function listWithPace(today: DayString): MaterialWithPace[] {
  return listMaterials().map((material) => withPace(material, today))
}

export function getMaterial(id: string): Material | null {
  const row = getDb().prepare(`${SELECT} WHERE m.id = ?`).get(id) as MaterialRow | undefined
  return row ? mapMaterial(row) : null
}

export function materialsForGoal(goalId: string, today: DayString): MaterialWithPace[] {
  return (
    getDb().prepare(`${SELECT} WHERE m.goal_id = ? ORDER BY m.created_at`).all(goalId) as
      MaterialRow[]
  )
    .map(mapMaterial)
    .map((material) => withPace(material, today))
}

/** Total units across a goal's materials, for the goal's progress bar. */
export function goalUnits(goalId: string): { done: number; total: number } {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(m.total_units - m.units_done_before), 0) AS total,
              COALESCE((SELECT SUM(t.done_units) FROM tasks t
                        JOIN materials mm ON mm.id = t.material_id
                        WHERE mm.goal_id = ?), 0) AS done
       FROM materials m WHERE m.goal_id = ?`
    )
    .get(goalId, goalId) as { total: number; done: number }
  return { done: row.done, total: row.total }
}

/**
 * Whether the app itself is holding this path. The renderer may ask to open a
 * material's file, but it may not name an arbitrary path of its own.
 */
export function hasFilePath(filePath: string): boolean {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM materials WHERE file_path = ?')
    .get(filePath) as { n: number }
  return row.n > 0
}

const COLUMNS: Record<string, string> = {
  goalId: 'goal_id',
  kind: 'kind',
  title: 'title',
  url: 'url',
  filePath: 'file_path',
  unitKind: 'unit_kind',
  totalUnits: 'total_units',
  unitsDoneBefore: 'units_done_before',
  minutesPerUnit: 'minutes_per_unit',
  weekdays: 'weekdays_json',
  studyTime: 'study_time',
  maxUnitsPerDay: 'max_units_per_day',
  targetDate: 'target_date',
  active: 'active'
}

function columnValue(key: string, value: unknown): unknown {
  if (key === 'weekdays') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 1 : 0
  return value
}

export function createMaterial(draft: MaterialDraft, now = Date.now()): Material {
  const db: Db = getDb()
  const id = newId('mat_')
  db.transaction(() => {
    db.prepare(
      `INSERT INTO materials (id, goal_id, kind, title, url, file_path, unit_kind, total_units,
                              units_done_before, minutes_per_unit, weekdays_json, study_time,
                              max_units_per_day, target_date, active, created_at, updated_at)
       VALUES (@id, @goalId, @kind, @title, @url, @filePath, @unitKind, @totalUnits,
               @unitsDoneBefore, @minutesPerUnit, @weekdays, @studyTime,
               @maxUnitsPerDay, @targetDate, 1, @now, @now)`
    ).run({
      id,
      goalId: draft.goalId ?? null,
      kind: draft.kind,
      title: draft.title.trim(),
      url: draft.url ?? null,
      filePath: draft.filePath ?? null,
      unitKind: draft.unitKind,
      totalUnits: draft.totalUnits,
      unitsDoneBefore: draft.unitsDoneBefore ?? 0,
      minutesPerUnit: draft.minutesPerUnit ?? null,
      weekdays: JSON.stringify(draft.weekdays),
      studyTime: draft.studyTime ?? null,
      maxUnitsPerDay: draft.maxUnitsPerDay ?? null,
      targetDate: draft.targetDate ?? null,
      now
    })
    if (draft.sections?.length) replaceSections(id, draft.sections)
  })()
  return getMaterial(id)!
}

export function updateMaterial(id: string, patch: MaterialPatch, now = Date.now()): Material {
  const db = getDb()
  db.transaction(() => {
    const assignments: string[] = []
    const values: Record<string, unknown> = { id, now }
    for (const [key, column] of Object.entries(COLUMNS)) {
      const value = (patch as Record<string, unknown>)[key]
      if (value === undefined) continue
      assignments.push(`${column} = @${key}`)
      values[key] = columnValue(key, value)
    }
    if (assignments.length > 0) {
      db.prepare(
        `UPDATE materials SET ${assignments.join(', ')}, updated_at = @now WHERE id = @id`
      ).run(values)
    }
    if (patch.sections) replaceSections(id, patch.sections)
  })()
  const material = getMaterial(id)
  if (!material) throw new Error(`Material ${id} no longer exists`)
  return material
}

export function deleteMaterial(id: string): void {
  getDb().prepare('DELETE FROM materials WHERE id = ?').run(id)
}
