import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { GrepTool } from '../../electron/main/engine/tools/grep'

let workingDir: string

beforeEach(async () => {
  workingDir = await mkdtemp(join(tmpdir(), 'nohi-grep-'))
})

afterEach(async () => {
  await rm(workingDir, { recursive: true, force: true })
})

const opts = () => ({ workingDir })

describe('GrepTool', () => {
  it('returns "No matches" when nothing matches', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'hello\nworld', 'utf-8')
    const r = await GrepTool.call({ pattern: 'zzz' }, opts())
    expect(r.error).toBeUndefined()
    expect(r.output).toMatch(/No matches/)
  })

  it('returns matches with line numbers', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'apple\nbanana\napple pie', 'utf-8')
    const r = await GrepTool.call({ pattern: 'apple' }, opts())
    expect(r.error).toBeUndefined()
    expect(r.output).toContain('apple')
    expect(r.output).toContain(':1:')
    expect(r.output).toContain(':3:')
  })

  it('rejects empty pattern', async () => {
    const r = await GrepTool.call({ pattern: '   ' }, opts())
    expect(r.error).toMatch(/non-empty/)
  })

  it('rejects path outside workingDir', async () => {
    const r = await GrepTool.call({ pattern: 'x', path: '../../../etc' }, opts())
    expect(r.error).toMatch(/outside working directory/i)
  })

  it('does not interpret shell metacharacters in pattern', async () => {
    // If we were using exec() with string interpolation, this would crash.
    // execFile() makes it safe.
    await writeFile(join(workingDir, 'a.txt'), '$(whoami)\nfoo', 'utf-8')
    const r = await GrepTool.call({ pattern: '$(whoami)' }, opts())
    expect(r.error).toBeUndefined()
    // Should match the literal text, not execute
    expect(r.output).toContain('$(whoami)')
  })
})
