import { describe, expect, it } from 'vitest'
import { parseDuration, parseQuickAdd } from '@shared/quickAdd'
import { toDayString } from '@shared/time'

const NOW = new Date(2026, 2, 10, 9, 0, 0).getTime() // Tue 10 Mar 2026, 09:00 local
const goals = [
  { id: 'g1', title: 'Final exam' },
  { id: 'g2', title: 'Ship v2' }
]

function parse(input: string) {
  return parseQuickAdd(input, { now: NOW, goals })
}

describe('parseDuration', () => {
  it.each([
    ['45m', 45],
    ['45', 45],
    ['90m', 90],
    ['1h', 60],
    ['1h30', 90],
    ['1h30m', 90],
    ['1.5h', 90],
    ['2,5h', 150]
  ])('parses %s', (token, expected) => {
    expect(parseDuration(token)).toBe(expected)
  })

  it('rejects nonsense', () => {
    expect(parseDuration('soon')).toBeNull()
    expect(parseDuration('0m')).toBeNull()
  })
})

describe('parseQuickAdd', () => {
  it('pulls apart a fully loaded line', () => {
    const result = parse('Write report tomorrow 2pm ~45m #work @exam !mit')
    expect(result.title).toBe('Write report')
    expect(result.day).toBe('2026-03-11')
    expect(result.estimateMinutes).toBe(45)
    expect(result.tags).toEqual(['work'])
    expect(result.goalId).toBe('g1')
    expect(result.isMit).toBe(true)
    expect(new Date(result.startAt!).getHours()).toBe(14)
  })

  it('defaults to today with no time when none is given', () => {
    const result = parse('Call the bank')
    expect(result.title).toBe('Call the bank')
    expect(result.day).toBe(toDayString(NOW))
    expect(result.startAt).toBeNull()
    expect(result.estimateMinutes).toBeNull()
  })

  it('keeps a plain date without inventing a start time', () => {
    const result = parse('Dentist on Friday')
    expect(result.title).toBe('Dentist')
    expect(result.day).toBe('2026-03-13')
    expect(result.startAt).toBeNull()
  })

  it('does not mistake a count in the title for a date', () => {
    const result = parse('Read 20 pages ~30m')
    expect(result.title).toBe('Read 20 pages')
    expect(result.estimateMinutes).toBe(30)
    expect(result.startAt).toBeNull()
  })

  it('collects several tags and keeps them lowercase', () => {
    expect(parse('Standup #Work #team').tags).toEqual(['work', 'team'])
  })

  it('reports an unmatched goal so the UI can offer to create it', () => {
    const result = parse('Draft outline @thesis')
    expect(result.goalQuery).toBe('thesis')
    expect(result.goalId).toBeNull()
    expect(result.title).toBe('Draft outline')
  })

  it('treats !! as an early reminder', () => {
    const result = parse('Leave for the airport 4pm !!')
    expect(result.remindMinutesBefore).toBe(30)
    expect(result.title).toBe('Leave for the airport')
  })
})
