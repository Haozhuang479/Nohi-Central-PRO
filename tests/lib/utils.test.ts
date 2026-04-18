import { describe, it, expect } from 'vitest'
import {
  castString, clampNumber, castBoolean, castStringArray,
  resolveSafePath, runTool, toolError, toolOk, ToolInputError, toolErrorFrom,
} from '../../electron/main/engine/tools/_utils'

describe('castString', () => {
  it('returns the value when valid', () => {
    expect(castString('hi', 'x')).toBe('hi')
  })
  it('throws ToolInputError on undefined', () => {
    expect(() => castString(undefined, 'x')).toThrow(ToolInputError)
  })
  it('throws on whitespace-only', () => {
    expect(() => castString('   ', 'x')).toThrow(/non-empty/)
  })
  it('returns default when undefined and default given', () => {
    expect(castString(undefined, 'x', { default: 'd' })).toBe('d')
  })
  it('returns "" when optional and missing', () => {
    expect(castString(undefined, 'x', { optional: true })).toBe('')
  })
  it('throws when wrong type', () => {
    expect(() => castString(42 as unknown, 'x')).toThrow(ToolInputError)
  })
  it('enforces maxLength', () => {
    expect(() => castString('aaaa', 'x', { maxLength: 3 })).toThrow(/too long/)
  })
})

describe('clampNumber', () => {
  it('returns the value when in range', () => {
    expect(clampNumber(5, { min: 1, max: 10, default: 3 })).toBe(5)
  })
  it('clamps to min', () => {
    expect(clampNumber(-1, { min: 1, max: 10, default: 3 })).toBe(1)
  })
  it('clamps to max', () => {
    expect(clampNumber(99, { min: 1, max: 10, default: 3 })).toBe(10)
  })
  it('returns default for undefined', () => {
    expect(clampNumber(undefined, { min: 1, max: 10, default: 3 })).toBe(3)
  })
  it('returns default for NaN string', () => {
    expect(clampNumber('abc', { min: 1, max: 10, default: 3 })).toBe(3)
  })
  it('coerces numeric string', () => {
    expect(clampNumber('7', { min: 1, max: 10, default: 3 })).toBe(7)
  })
})

describe('castBoolean', () => {
  it('returns false for undefined by default', () => {
    expect(castBoolean(undefined)).toBe(false)
  })
  it('honors default', () => {
    expect(castBoolean(undefined, true)).toBe(true)
  })
  it('coerces truthy', () => {
    expect(castBoolean(1)).toBe(true)
    expect(castBoolean('yes')).toBe(true)
  })
})

describe('castStringArray', () => {
  it('returns [] for undefined', () => {
    expect(castStringArray(undefined, 'x')).toEqual([])
  })
  it('returns the array for strings', () => {
    expect(castStringArray(['a', 'b'], 'x')).toEqual(['a', 'b'])
  })
  it('throws on non-array', () => {
    expect(() => castStringArray('hi' as unknown, 'x')).toThrow(ToolInputError)
  })
  it('throws on mixed types', () => {
    expect(() => castStringArray(['a', 1] as unknown, 'x')).toThrow(ToolInputError)
  })
})

describe('resolveSafePath', () => {
  it('rejects empty path', () => {
    const r = resolveSafePath('', '/tmp')
    expect('error' in r).toBe(true)
  })
  it('rejects non-string path', () => {
    const r = resolveSafePath(42 as unknown, '/tmp')
    expect('error' in r).toBe(true)
  })
  it('accepts a path inside workingDir', () => {
    const r = resolveSafePath('foo.txt', '/tmp')
    expect('path' in r).toBe(true)
    if ('path' in r) expect(r.path).toBe('/tmp/foo.txt')
  })
  it('rejects ../escape', () => {
    const r = resolveSafePath('../../../etc/passwd', '/tmp/work')
    expect('error' in r).toBe(true)
  })
  it('honors allow list', () => {
    const r = resolveSafePath('/etc/passwd', '/tmp', { allow: ['/etc'] })
    expect('path' in r).toBe(true)
  })
})

describe('runTool', () => {
  it('returns the body result on success', async () => {
    const r = await runTool(async () => toolOk('done'))
    expect(r.output).toBe('done')
  })
  it('catches ToolInputError and returns its message', async () => {
    const r = await runTool(async () => { throw new ToolInputError('bad input') })
    expect(r.error).toBe('bad input')
  })
  it('catches generic errors with context', async () => {
    const r = await runTool(async () => { throw new Error('boom') }, 'mytool')
    expect(r.error).toMatch(/mytool: boom/)
  })
})

describe('toolErrorFrom', () => {
  it('maps ENOENT', () => {
    expect(toolErrorFrom({ code: 'ENOENT' })).toEqual({ error: 'file not found' })
  })
  it('maps EACCES', () => {
    expect(toolErrorFrom({ code: 'EACCES' })).toEqual({ error: 'permission denied' })
  })
  it('maps TimeoutError', () => {
    expect(toolErrorFrom({ name: 'TimeoutError' })).toEqual({ error: 'timed out' })
  })
  it('falls back to message', () => {
    expect(toolErrorFrom({ message: 'something bad' })).toEqual({ error: 'something bad' })
  })
})

describe('toolError / toolOk', () => {
  it('toolError wraps message', () => {
    expect(toolError('x')).toEqual({ error: 'x' })
  })
  it('toolOk wraps output', () => {
    expect(toolOk('x')).toEqual({ output: 'x' })
  })
})
