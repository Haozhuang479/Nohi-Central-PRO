// Unit tests for the line-based plan diff helper used by PlanApproval.

import { describe, it, expect } from 'vitest'
import { diffLines, hasChanges } from '../../src/lib/plan-diff'

describe('diffLines', () => {
  it('returns all-same when inputs are identical', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc')
    expect(result).toEqual([
      { kind: 'same', line: 'a' },
      { kind: 'same', line: 'b' },
      { kind: 'same', line: 'c' },
    ])
  })

  it('detects pure additions at the end', () => {
    const result = diffLines('a\nb', 'a\nb\nc')
    expect(result).toEqual([
      { kind: 'same', line: 'a' },
      { kind: 'same', line: 'b' },
      { kind: 'add', line: 'c' },
    ])
  })

  it('detects pure deletions at the end', () => {
    const result = diffLines('a\nb\nc', 'a\nb')
    expect(result).toEqual([
      { kind: 'same', line: 'a' },
      { kind: 'same', line: 'b' },
      { kind: 'del', line: 'c' },
    ])
  })

  it('handles a mid-range replacement (del + add)', () => {
    const result = diffLines('a\nb\nc', 'a\nX\nc')
    // The order of add/del adjacent doesn't matter functionally; assert
    // the multiset matches.
    const dels = result.filter((d) => d.kind === 'del').map((d) => d.line)
    const adds = result.filter((d) => d.kind === 'add').map((d) => d.line)
    const sames = result.filter((d) => d.kind === 'same').map((d) => d.line)
    expect(dels).toEqual(['b'])
    expect(adds).toEqual(['X'])
    expect(sames).toEqual(['a', 'c'])
  })

  it('handles two completely different texts', () => {
    const result = diffLines('a\nb', 'x\ny')
    const dels = result.filter((d) => d.kind === 'del').map((d) => d.line).sort()
    const adds = result.filter((d) => d.kind === 'add').map((d) => d.line).sort()
    expect(dels).toEqual(['a', 'b'])
    expect(adds).toEqual(['x', 'y'])
  })

  it('treats the empty string sensibly', () => {
    const r1 = diffLines('', 'a\nb')
    expect(r1.filter((d) => d.kind === 'add').map((d) => d.line)).toEqual(['a', 'b'])

    const r2 = diffLines('a\nb', '')
    expect(r2.filter((d) => d.kind === 'del').map((d) => d.line)).toEqual(['a', 'b'])
  })
})

describe('hasChanges', () => {
  it('returns false for identical inputs (trimmed)', () => {
    expect(hasChanges('hello', 'hello')).toBe(false)
    expect(hasChanges('hello\n', 'hello')).toBe(false)
  })
  it('returns true for any meaningful difference', () => {
    expect(hasChanges('a', 'b')).toBe(true)
    expect(hasChanges('a\nb', 'a\nb\nc')).toBe(true)
  })
})
