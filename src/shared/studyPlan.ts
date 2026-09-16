import type {
  DayString,
  Material,
  MaterialSection,
  MaterialSectionDraft,
  StudyPace
} from './types'
import { UNIT_LABELS } from './types'
import { addDays, daysBetween, weekdayIndex } from './time'

/**
 * How much of a course or a book belongs to one day.
 *
 * The share is recomputed from what is *still* left every single day rather
 * than being fixed when the material is added. Miss a Tuesday and Wednesday
 * quietly grows; get ahead on Saturday and Monday shrinks. Nothing has to be
 * rolled over, and the plan can never drift away from the deadline.
 */

/** A material with no weekdays chosen would never come up; treat it as daily. */
function studyWeekdays(weekdays: number[]): number[] {
  return weekdays.length > 0 ? weekdays : [0, 1, 2, 3, 4, 5, 6]
}

export function isStudyDay(weekdays: number[], day: DayString): boolean {
  return studyWeekdays(weekdays).includes(weekdayIndex(day))
}

/** A deadline years out is a typo, not a plan - the scan stops rather than hangs. */
const MAX_SCAN_DAYS = 730

export function countStudyDays(weekdays: number[], from: DayString, to: DayString): number {
  const span = daysBetween(from, to)
  if (span < 0) return 0
  let count = 0
  for (let i = 0; i <= Math.min(span, MAX_SCAN_DAYS); i += 1) {
    if (isStudyDay(weekdays, addDays(from, i))) count += 1
  }
  return count
}

/** The day of the nth study day counted from `from`, where `from` itself is the first. */
function nthStudyDay(weekdays: number[], from: DayString, n: number): DayString | null {
  let seen = 0
  for (let i = 0; i <= MAX_SCAN_DAYS; i += 1) {
    const day = addDays(from, i)
    if (!isStudyDay(weekdays, day)) continue
    seen += 1
    if (seen >= n) return day
  }
  return null
}

export function paceFor(material: Material, unitsDone: number, day: DayString): StudyPace {
  const done = Math.max(0, unitsDone)
  const remainingUnits = Math.max(0, material.totalUnits - material.unitsDoneBefore - done)
  const studyDaysLeft = material.targetDate
    ? countStudyDays(material.weekdays, day, material.targetDate)
    : 0

  let unitsToday: number
  if (remainingUnits === 0) {
    unitsToday = 0
  } else if (studyDaysLeft > 0) {
    unitsToday = Math.ceil(remainingUnits / studyDaysLeft)
  } else if (material.targetDate) {
    // The deadline is here, or behind us: what is left is what is owed today.
    unitsToday = remainingUnits
  } else {
    // No deadline to divide by, so fall back to a steady drip.
    unitsToday = material.maxUnitsPerDay ?? 1
  }
  unitsToday = Math.min(unitsToday, remainingUnits)

  const ceiling = material.maxUnitsPerDay
  const overloaded = ceiling != null && unitsToday > ceiling
  if (overloaded) unitsToday = ceiling

  const unitFrom = material.unitsDoneBefore + done + 1
  return {
    remainingUnits,
    studyDaysLeft,
    unitsToday,
    unitFrom,
    unitTo: unitFrom + Math.max(1, unitsToday) - 1,
    minutesToday: material.minutesPerUnit != null ? material.minutesPerUnit * unitsToday : null,
    overloaded,
    projectedFinishDay:
      overloaded && ceiling
        ? nthStudyDay(material.weekdays, day, Math.ceil(remainingUnits / ceiling))
        : null
  }
}

/** The chapters a stretch of pages (or of chapter numbers) runs through. */
export function sectionsInRange(
  sections: MaterialSection[],
  from: number,
  to: number
): MaterialSection[] {
  return sections.filter((section) => section.startUnit <= to && section.endUnit >= from)
}

function rangeLabel(material: Material, from: number, to: number): string {
  const unit = UNIT_LABELS[material.unitKind].many
  return from === to ? `${unit} ${from}` : `${unit} ${from}–${to}`
}

/**
 * The title of a generated task, in the words of whatever is being worked
 * through: "trang 45–68 · Ch.3 Functions" reads like an instruction, whereas
 * "3 units" would need decoding every morning.
 */
export function describeAssignment(
  material: Material,
  pace: StudyPace,
  sections: MaterialSection[] = []
): string {
  const range = rangeLabel(material, pace.unitFrom, pace.unitTo)
  const head =
    material.unitKind === 'lesson' && pace.unitsToday > 1
      ? `${pace.unitsToday} ${UNIT_LABELS.lesson.many} (${range})`
      : range

  const covered = sectionsInRange(sections, pace.unitFrom, pace.unitTo)
  // Chapter numbers already say which chapter; only pages need the names.
  const named =
    material.unitKind === 'page' && covered.length > 0
      ? ` · ${covered.slice(0, 2).map((s) => s.title).join(', ')}${covered.length > 2 ? '…' : ''}`
      : ''

  return `${material.title} — ${head}${named}`
}

/**
 * Bookmarks give a chapter's first page but not its last, so each one runs up
 * to the page before the next - and the final one to the end of the book.
 */
export function sectionsFromPages(
  starts: { title: string; startPage: number }[],
  pageCount: number
): MaterialSectionDraft[] {
  const sorted = [...starts].sort((a, b) => a.startPage - b.startPage)
  return sorted.map((section, index) => ({
    title: section.title,
    startUnit: section.startPage,
    endUnit: (sorted[index + 1]?.startPage ?? pageCount + 1) - 1
  }))
}
