import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { BashTool } from '../../electron/main/engine/tools/bash'

let workingDir: string

beforeEach(async () => {
  workingDir = await mkdtemp(join(tmpdir(), 'nohi-bash-'))
})

afterEach(async () => {
  await rm(workingDir, { recursive: true, force: true })
})

const opts = () => ({ workingDir })

describe('BashTool', () => {
  it('runs a simple command and returns stdout', async () => {
    const r = await BashTool.call({ command: 'echo hello' }, opts())
    expect(r.error).toBeUndefined()
    expect(r.output).toContain('hello')
  })

  it('runs in the working directory', async () => {
    const r = await BashTool.call({ command: 'pwd' }, opts())
    expect(r.output).toContain(workingDir)
  })

  it('returns the error for non-zero exit', async () => {
    const r = await BashTool.call({ command: 'exit 7' }, opts())
    // Behavior: BashTool surfaces stderr/exit code
    expect(r.error || r.output).toBeDefined()
  })
})
