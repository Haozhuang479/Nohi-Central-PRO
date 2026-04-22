// Unit tests for the hand-rolled cron parser + matcher.
// Covers the four syntactic forms (literal, list, range, step) plus the
// OR-of-DOM-DOW behaviour that matches Vixie cron.

import { describe, it, expect } from 'vitest'
import {
  cronError,
  cronMatches,
  describeCron,
  nextCronRun,
  parseCron,
} from '../../electron/main/engine/automation/cron'

function at(y: number, mon: number, d: number, h: number, min: number): Date {
  // Month is 1-based here for readability; Date expects 0-based.
  return new Date(y, mon - 1, d, h, min, 0, 0)
}

describe('parseCron', () => {
  it('accepts the canonical 5-field format', () => {
    const s = parseCron('0 14 * * 1,3,5')
    expect(s.minute.has(0)).toBe(true)
    expect(s.hour.has(14)).toBe(true)
    expect(s.dayOfWeek.has(1)).toBe(true)
    expect(s.dayOfWeek.has(3)).toBe(true)
    expect(s.dayOfWeek.has(5)).toBe(true)
    expect(s.dayOfWeek.has(2)).toBe(false)
  })

  it('handles ranges and steps', () => {
    const s = parseCron('*/15 9-17 * * 1-5')
    expect([...s.minute].sort((a, b) => a - b)).toEqual([0, 15, 30, 45])
    expect(s.hour.size).toBe(9) // 9..17 inclusive
    expect(s.dayOfWeek.size).toBe(5)
  })

  it('rejects obvious garbage', () => {
    expect(cronError('not a cron')).toContain('5 fields')
    expect(cronError('0 99 * * *')).toContain('out of range')
    expect(cronError('* * * *')).toContain('5 fields')
  })

  it('returns null for valid expressions', () => {
    expect(cronError('0 9 * * *')).toBeNull()
    expect(cronError('*/5 * * * *')).toBeNull()
  })
})

describe('cronMatches', () => {
  it('fires Monday+Wednesday at 14:00 exactly', () => {
    const spec = parseCron('0 14 * * 1,3')
    // 2026-04-22 is a Wednesday
    expect(cronMatches(spec, at(2026, 4, 22, 14, 0))).toBe(true)
    // Wednesday at 14:01 misses the minute
    expect(cronMatches(spec, at(2026, 4, 22, 14, 1))).toBe(false)
    // Tuesday at 14:00 misses the dow
    expect(cronMatches(spec, at(2026, 4, 21, 14, 0))).toBe(false)
    // Monday — also match
    expect(cronMatches(spec, at(2026, 4, 20, 14, 0))).toBe(true)
  })

  it('every 15 min fires on the quarter hour', () => {
    const spec = parseCron('*/15 * * * *')
    expect(cronMatches(spec, at(2026, 1, 1, 0, 15))).toBe(true)
    expect(cronMatches(spec, at(2026, 1, 1, 0, 16))).toBe(false)
  })

  it('wildcarded DOM + DOW fires on every day', () => {
    const spec = parseCron('0 9 * * *')
    for (let d = 1; d <= 7; d++) {
      expect(cronMatches(spec, at(2026, 4, d, 9, 0))).toBe(true)
    }
  })
})

describe('nextCronRun', () => {
  it('jumps to the next qualifying minute strictly after now', () => {
    const spec = parseCron('0 14 * * *')
    // 2026-04-22 13:59 → next is 2026-04-22 14:00
    const next = nextCronRun(spec, at(2026, 4, 22, 13, 59))!
    const d = new Date(next)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(0)
    expect(d.getDate()).toBe(22)
  })

  it('rolls to tomorrow when today has already fired', () => {
    const spec = parseCron('0 9 * * *')
    const next = nextCronRun(spec, at(2026, 4, 22, 12, 0))!
    const d = new Date(next)
    expect(d.getDate()).toBe(23)
    expect(d.getHours()).toBe(9)
  })
})

describe('describeCron', () => {
  it('describes simple daily and weekly expressions in EN', () => {
    // Exact phrasing is aesthetic — assert only the mechanical pieces.
    expect(describeCron('0 9 * * *', 'en')).toMatch(/9:00|09:00/)
    const d = describeCron('0 14 * * 1,3', 'en')
    expect(d).toMatch(/1,3/)
    expect(d).toMatch(/14/)
  })

  it('returns empty string for malformed input', () => {
    expect(describeCron('not valid', 'en')).toBe('')
  })
})
