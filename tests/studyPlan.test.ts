import { describe, expect, it } from 'vitest'
import type { Material, MaterialSection } from '@shared/types'
import {
  countStudyDays,
  describeAssignment,
  isStudyDay,
  paceFor,
  sectionsFromPages,
  sectionsInRange
} from '@shared/studyPlan'

// 2026-03-09 is a Monday; 2026-03-20 is the Friday eleven days later.
const MON = '2026-03-09'
const SAT = '2026-03-14'
const WEEKDAYS = [0, 1, 2, 3, 4]

function material(overrides: Partial<Material> = {}): Material {
  return {
    id: 'mat_1',
    goalId: null,
    kind: 'course',
    title: 'Machine Learning',
    url: 'https://coursera.org/learn/ml',
    filePath: null,
    unitKind: 'lesson',
    totalUnits: 60,
    unitsDoneBefore: 0,
    minutesPerUnit: 15,
    weekdays: WEEKDAYS,
    studyTime: '20:00',
    maxUnitsPerDay: null,
    targetDate: '2026-03-20',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

describe('isStudyDay', () => {
  it('follows the chosen weekdays', () => {
    expect(isStudyDay(WEEKDAYS, MON)).toBe(true)
    expect(isStudyDay(WEEKDAYS, SAT)).toBe(false)
  })

  it('treats an empty selection as every day, so nothing is silently never due', () => {
    expect(isStudyDay([], SAT)).toBe(true)
  })
})

describe('countStudyDays', () => {
  it('counts only eligible days, both ends included', () => {
    // Mon 9th to Fri 20th: two full working weeks.
    expect(countStudyDays(WEEKDAYS, MON, '2026-03-20')).toBe(10)
  })

  it('is zero once the deadline is behind us', () => {
    expect(countStudyDays(WEEKDAYS, '2026-03-20', MON)).toBe(0)
  })
})

describe('paceFor', () => {
  it('spreads the work evenly over the remaining study days', () => {
    const pace = paceFor(material(), 0, MON)
    expect(pace.studyDaysLeft).toBe(10)
    expect(pace.unitsToday).toBe(6)
    expect(pace.unitFrom).toBe(1)
    expect(pace.unitTo).toBe(6)
    expect(pace.minutesToday).toBe(90)
  })

  it('carries on from where the user actually stopped', () => {
    const pace = paceFor(material(), 6, '2026-03-10')
    expect(pace.unitFrom).toBe(7)
    expect(pace.remainingUnits).toBe(54)
  })

  it('raises the daily share after a missed day instead of rolling work forward', () => {
    const monday = paceFor(material(), 0, MON)
    // Monday was missed entirely: nothing logged, one fewer day to do it in.
    const tuesday = paceFor(material(), 0, '2026-03-10')
    expect(tuesday.studyDaysLeft).toBe(9)
    expect(tuesday.unitsToday).toBeGreaterThan(monday.unitsToday)
    expect(tuesday.unitFrom).toBe(1)
  })

  it('lowers it again when the user gets ahead', () => {
    const ahead = paceFor(material(), 20, '2026-03-10')
    expect(ahead.unitsToday).toBeLessThan(6)
  })

  it('counts what was already done before the material was added', () => {
    const pace = paceFor(material({ unitsDoneBefore: 30 }), 0, MON)
    expect(pace.remainingUnits).toBe(30)
    expect(pace.unitFrom).toBe(31)
    expect(pace.unitsToday).toBe(3)
  })

  it('asks for everything left once the deadline has arrived', () => {
    const pace = paceFor(material({ targetDate: MON }), 55, MON)
    expect(pace.unitsToday).toBe(5)
  })

  it('drips along at a steady pace when there is no deadline at all', () => {
    const pace = paceFor(material({ targetDate: null, maxUnitsPerDay: 2 }), 0, MON)
    expect(pace.unitsToday).toBe(2)
  })

  it('flags a deadline that the daily ceiling cannot meet, and says when it could', () => {
    const pace = paceFor(material({ maxUnitsPerDay: 3 }), 0, MON)
    expect(pace.overloaded).toBe(true)
    expect(pace.unitsToday).toBe(3)
    // 60 lessons at 3 a day is 20 weekdays: four working weeks from the Monday.
    expect(pace.projectedFinishDay).toBe('2026-04-03')
  })

  it('asks for nothing once the material is finished', () => {
    const pace = paceFor(material(), 60, MON)
    expect(pace.remainingUnits).toBe(0)
    expect(pace.unitsToday).toBe(0)
  })

  it('never asks for more than is left', () => {
    const pace = paceFor(material({ totalUnits: 4 }), 0, MON)
    expect(pace.unitsToday).toBe(1)
  })

  it('walks the whole material without overlap or gaps', () => {
    const book = material({ totalUnits: 20, unitKind: 'page', minutesPerUnit: null })
    let done = 0
    const covered: number[] = []
    for (let i = 0; i < 40; i += 1) {
      const pace = paceFor(book, done, MON)
      if (pace.unitsToday === 0) break
      for (let unit = pace.unitFrom; unit <= pace.unitTo; unit += 1) covered.push(unit)
      done += pace.unitsToday
    }
    expect(covered).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })
})

describe('sectionsFromPages', () => {
  it('runs each chapter up to the page before the next one', () => {
    const sections = sectionsFromPages(
      [
        { title: 'Two', startPage: 10 },
        { title: 'One', startPage: 1 }
      ],
      30
    )
    expect(sections).toEqual([
      { title: 'One', startUnit: 1, endUnit: 9 },
      { title: 'Two', startUnit: 10, endUnit: 30 }
    ])
  })
})

const CHAPTERS: MaterialSection[] = [
  { id: 's1', materialId: 'mat_1', title: 'Ch.1 Clean Code', startUnit: 1, endUnit: 20, sortOrder: 1 },
  { id: 's2', materialId: 'mat_1', title: 'Ch.2 Names', startUnit: 21, endUnit: 40, sortOrder: 2 },
  { id: 's3', materialId: 'mat_1', title: 'Ch.3 Functions', startUnit: 41, endUnit: 60, sortOrder: 3 }
]

describe('sectionsInRange', () => {
  it('returns every chapter a stretch of pages touches', () => {
    expect(sectionsInRange(CHAPTERS, 18, 22).map((s) => s.title)).toEqual([
      'Ch.1 Clean Code',
      'Ch.2 Names'
    ])
  })

  it('returns nothing when the table of contents is empty', () => {
    expect(sectionsInRange([], 1, 5)).toEqual([])
  })
})

describe('describeAssignment', () => {
  const book = material({ kind: 'book', title: 'Clean Code', unitKind: 'page', totalUnits: 60 })

  it('names the lessons of a course', () => {
    const course = material()
    expect(describeAssignment(course, paceFor(course, 0, MON))).toBe(
      'Machine Learning — 6 bài (bài 1–6)'
    )
  })

  it('drops the count when a day is a single lesson', () => {
    const course = material({ totalUnits: 1 })
    expect(describeAssignment(course, paceFor(course, 0, MON))).toBe('Machine Learning — bài 1')
  })

  it('names the chapters a day of reading falls in', () => {
    expect(describeAssignment(book, paceFor(book, 0, MON), CHAPTERS)).toBe(
      'Clean Code — trang 1–6 · Ch.1 Clean Code'
    )
  })

  it('leaves the chapter names off when there is no table of contents', () => {
    expect(describeAssignment(book, paceFor(book, 0, MON))).toBe('Clean Code — trang 1–6')
  })

  it('counts chapters directly when that is the unit', () => {
    const byChapter = material({ kind: 'book', title: 'Clean Code', unitKind: 'chapter', totalUnits: 20 })
    expect(describeAssignment(byChapter, paceFor(byChapter, 0, MON), CHAPTERS)).toBe(
      'Clean Code — chương 1–2'
    )
  })
})
