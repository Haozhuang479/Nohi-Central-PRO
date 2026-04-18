import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { FileReadTool } from '../../electron/main/engine/tools/fileRead'
import { FileWriteTool } from '../../electron/main/engine/tools/fileWrite'
import { FileEditTool } from '../../electron/main/engine/tools/fileEdit'
import { GlobTool } from '../../electron/main/engine/tools/glob'

let workingDir: string

beforeEach(async () => {
  workingDir = await mkdtemp(join(tmpdir(), 'nohi-test-'))
})

afterEach(async () => {
  await rm(workingDir, { recursive: true, force: true })
})

const opts = () => ({ workingDir })

describe('FileReadTool', () => {
  it('reads an existing file', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'hello world', 'utf-8')
    const r = await FileReadTool.call({ file_path: 'a.txt' }, opts())
    expect(r.error).toBeUndefined()
    expect(r.output).toContain('hello world')
  })

  it('rejects path traversal outside workingDir', async () => {
    const r = await FileReadTool.call({ file_path: '../../../etc/passwd' }, opts())
    expect(r.error).toBeDefined()
    expect(r.error).toMatch(/outside working directory/i)
  })

  it('reports ENOENT clearly', async () => {
    const r = await FileReadTool.call({ file_path: 'nope.txt' }, opts())
    expect(r.error).toMatch(/not found|ENOENT/i)
  })
})

describe('FileWriteTool', () => {
  it('writes a new file', async () => {
    const r = await FileWriteTool.call({ file_path: 'out.txt', content: 'data' }, opts())
    expect(r.error).toBeUndefined()
    const content = await readFile(join(workingDir, 'out.txt'), 'utf-8')
    expect(content).toBe('data')
  })

  it('rejects path traversal', async () => {
    const r = await FileWriteTool.call({ file_path: '../escaped.txt', content: 'x' }, opts())
    expect(r.error).toMatch(/outside working directory/i)
  })
})

describe('FileEditTool', () => {
  it('replaces unique old_string', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'hello world', 'utf-8')
    const r = await FileEditTool.call(
      { file_path: 'a.txt', old_string: 'world', new_string: 'mars' },
      opts(),
    )
    expect(r.error).toBeUndefined()
    expect(r.output).toContain('mars')
    const content = await readFile(join(workingDir, 'a.txt'), 'utf-8')
    expect(content).toBe('hello mars')
  })

  it('rejects when old_string appears multiple times', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'a a a', 'utf-8')
    const r = await FileEditTool.call(
      { file_path: 'a.txt', old_string: 'a', new_string: 'b' },
      opts(),
    )
    expect(r.error).toMatch(/appears \d+ times/)
  })

  it('rejects identical old/new strings', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'x', 'utf-8')
    const r = await FileEditTool.call(
      { file_path: 'a.txt', old_string: 'x', new_string: 'x' },
      opts(),
    )
    expect(r.error).toMatch(/identical/i)
  })

  it('returns a unified diff in output', async () => {
    await writeFile(join(workingDir, 'a.txt'), 'foo', 'utf-8')
    const r = await FileEditTool.call(
      { file_path: 'a.txt', old_string: 'foo', new_string: 'bar' },
      opts(),
    )
    expect(r.output).toContain('```diff')
    expect(r.output).toContain('- foo')
    expect(r.output).toContain('+ bar')
  })
})

describe('GlobTool', () => {
  it('finds files matching pattern', async () => {
    await writeFile(join(workingDir, 'a.ts'), '', 'utf-8')
    await writeFile(join(workingDir, 'b.ts'), '', 'utf-8')
    await writeFile(join(workingDir, 'c.js'), '', 'utf-8')
    const r = await GlobTool.call({ pattern: '*.ts' }, opts())
    expect(r.error).toBeUndefined()
    expect(r.output).toContain('a.ts')
    expect(r.output).toContain('b.ts')
    expect(r.output).not.toContain('c.js')
  })
})
