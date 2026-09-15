/**
 * Local-time helpers. Days are 'YYYY-MM-DD' strings in the user's local zone so
 * that "today" always matches what the user sees on their clock; instants are
 * epoch milliseconds. Every function is pure and takes its inputs explicitly so
 * the scheduling logic can be tested without touching the real clock.
 */

export type DayString = string
export type Instant = number

export const MINUTE_MS = 60_000
export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function toDayString(date: Date | Instant): DayString {
  const d = typeof date === 'number' ? new Date(date) : date
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local midnight at the start of the given day. */
export function startOfDay(day: DayString): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function endOfDay(day: DayString): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

export function addDays(day: DayString, delta: number): DayString {
  const d = startOfDay(day)
  d.setDate(d.getDate() + delta)
  return toDayString(d)
}

/** Whole days between two day strings (b - a). */
export function daysBetween(a: DayString, b: DayString): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / DAY_MS)
}

/** Minutes elapsed since local midnight. */
export function minutesOfDay(at: Instant | Date): number {
  const d = typeof at === 'number' ? new Date(at) : at
  return d.getHours() * 60 + d.getMinutes()
}

/** '23:30' -> 1410. Returns null for malformed input. */
export function parseHhMm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function formatHhMm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** Instant of 'HH:mm' on the given local day. */
export function atTimeOnDay(day: DayString, hhmm: string, fallbackMinutes = 0): Instant {
  const mins = parseHhMm(hhmm) ?? fallbackMinutes
  return startOfDay(day).getTime() + mins * MINUTE_MS
}

/** 95 -> '1h 35m', 45 -> '45m', 0 -> '0m' */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** 1500 -> '25:00' */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${pad(m)}:${pad(s)}`
}

/** Monday-first weekday index: Mon = 0 ... Sun = 6. */
export function weekdayIndex(day: DayString): number {
  return (startOfDay(day).getDay() + 6) % 7
}

/** The Monday of the week containing `day`. */
export function startOfWeek(day: DayString): DayString {
  return addDays(day, -weekdayIndex(day))
}

export function dayLabel(day: DayString, today: DayString): string {
  const delta = daysBetween(today, day)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  return startOfDay(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function rangeOfDays(from: DayString, count: number): DayString[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i))
}
