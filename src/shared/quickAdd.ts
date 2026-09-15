import * as chrono from 'chrono-node'
import type { DayString, Instant } from './types'
import { toDayString } from './time'

/**
 * Parses one typed line into a task.
 *
 *   Write report tmr 2pm ~45m #work @exam !mit
 *
 * Dates and times are left to chrono-node; the terse tokens (`~45m`, `#tag`,
 * `@goal`, `!mit`, `!!`) are ours. Whatever survives the strip is the title.
 */

export interface QuickAddGoal {
  id: string
  title: string
}

export interface QuickAddContext {
  now: Instant
  goals?: QuickAddGoal[]
  urgentRemindMinutes?: number
}

export interface QuickAddResult {
  title: string
  day: DayString
  startAt: Instant | null
  estimateMinutes: number | null
  tags: string[]
  goalId: string | null
  goalQuery: string | null
  isMit: boolean
  remindMinutesBefore: number | null
}

/** '45m' | '90' | '1h' | '1h30' | '1.5h' -> minutes. */
export function parseDuration(token: string): number | null {
  const raw = token.trim().toLowerCase().replace(',', '.')
  if (!raw) return null

  const hoursAndMinutes = /^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/.exec(raw)
  if (hoursAndMinutes) {
    const hours = Number(hoursAndMinutes[1])
    const minutes = hoursAndMinutes[2] ? Number(hoursAndMinutes[2]) : 0
    const total = Math.round(hours * 60 + minutes)
    return total > 0 ? total : null
  }

  const minutesOnly = /^(\d+)\s*m?$/.exec(raw)
  if (minutesOnly) {
    const total = Number(minutesOnly[1])
    return total > 0 ? total : null
  }
  return null
}

function cleanTitle(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')
    .trim()
}

function matchGoal(query: string, goals: QuickAddGoal[]): string | null {
  const needle = query.toLowerCase()
  const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const exact = goals.find((g) => normalise(g.title) === normalise(needle))
  if (exact) return exact.id
  const prefix = goals.find((g) => normalise(g.title).startsWith(normalise(needle)))
  if (prefix) return prefix.id
  const contains = goals.find((g) => normalise(g.title).includes(normalise(needle)))
  return contains?.id ?? null
}

export function parseQuickAdd(input: string, context: QuickAddContext): QuickAddResult {
  const { now, goals = [], urgentRemindMinutes = 30 } = context
  let text = input

  let estimateMinutes: number | null = null
  text = text.replace(/~\s*([0-9]+(?:[.,][0-9]+)?\s*h(?:\s*[0-9]+\s*m?)?|[0-9]+\s*m?)\b/gi, (_, token: string) => {
    const parsed = parseDuration(token)
    if (parsed != null) estimateMinutes = parsed
    return ' '
  })

  const tags: string[] = []
  text = text.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (_, lead: string, tag: string) => {
    const normalised = tag.toLowerCase()
    if (!tags.includes(normalised)) tags.push(normalised)
    return lead
  })

  let goalQuery: string | null = null
  text = text.replace(/(^|\s)@([\p{L}\p{N}_-]+)/gu, (_, lead: string, query: string) => {
    goalQuery = query
    return lead
  })

  let isMit = false
  text = text.replace(/(^|\s)!mit\b/gi, (_, lead: string) => {
    isMit = true
    return lead
  })

  let remindMinutesBefore: number | null = null
  text = text.replace(/(^|\s)!!(?=\s|$)/g, (_, lead: string) => {
    remindMinutesBefore = urgentRemindMinutes
    return lead
  })

  let startAt: Instant | null = null
  let day = toDayString(now)

  const results = chrono.parse(text, new Date(now), { forwardDate: true })
  // A bare number is far more often part of the title ("Read 20 pages") than a
  // date, so only accept a match that carries a real date or time word.
  const usable = results.find((r) => !/^\d+$/.test(r.text.trim()))
  if (usable) {
    const date = usable.start.date()
    day = toDayString(date)
    if (usable.start.isCertain('hour')) startAt = date.getTime()
    text = text.slice(0, usable.index) + ' ' + text.slice(usable.index + usable.text.length)
  }

  return {
    title: cleanTitle(text),
    day,
    startAt,
    estimateMinutes,
    tags,
    goalId: goalQuery ? matchGoal(goalQuery, goals) : null,
    goalQuery,
    isMit,
    remindMinutesBefore
  }
}
