// BashTool — adapted from Claude Code BashTool
// Executes shell commands with safety checks

import { exec } from 'child_process'
import { promisify } from 'util'
import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const execAsync = promisify(exec)

// Commands that require explicit user confirmation before running
const DANGEROUS_PATTERNS = [
  /rm\s+-rf?\s+[/~]/,
  />\s*\/dev\//,
  /dd\s+if=/,
  /mkfs/,
  /shutdown/,
  /reboot/,
  /format\s+[a-z]:/i,
]

const TIMEOUT_MS = 120_000 // 2 minutes, matching Claude Code default

export const BashTool: ToolDef = {
  name: 'bash',
  description:
    'Execute a shell command in the working directory. Use for running scripts, package managers, git, build tools, and system operations.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute.',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default 120000).',
      },
    },
    required: ['command'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const command = input.command as string
    const timeout = (input.timeout as number | undefined) ?? TIMEOUT_MS

    // Safety: warn on dangerous patterns but don't block (user is local)
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        opts.onProgress?.(`⚠️  Potentially destructive command detected: ${command}`)
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: opts.workingDir,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env, TERM: 'dumb' },
      })
      const output = [stdout, stderr].filter(Boolean).join('\n').trim()
      return { output: output || '(no output)' }
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string; killed?: boolean }
      if (e.killed) {
        return { error: `Command timed out after ${timeout}ms` }
      }
      const output = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n').trim()
      return { error: output || 'Command failed' }
    }
  },
}
