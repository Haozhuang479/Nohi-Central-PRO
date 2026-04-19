// Run the TypeScript compiler in --noEmit mode as a regression test.
// Catches any undefined-identifier / type-error that slips past development
// (exactly the class of bug that bit v2.5.0 and v2.5.1 when helpers were
// removed from chat/page.tsx without updating call sites).

import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

describe('regression: TypeScript typecheck is clean', () => {
  it('tsc --noEmit reports zero errors across the full project', () => {
    let stderr = ''
    let stdout = ''
    try {
      stdout = execSync('npx tsc --noEmit', {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      const e = err as { stdout?: Buffer | string; stderr?: Buffer | string }
      stdout = e.stdout?.toString() ?? ''
      stderr = e.stderr?.toString() ?? ''
      expect.fail(`tsc reported errors:\n${stdout || stderr}`)
    }
    expect(stdout.trim()).toBe('')
    expect(stderr.trim()).toBe('')
  }, 60_000)
})
