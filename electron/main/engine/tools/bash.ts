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

// Decide whether the user needs to approve this command. Keeps the policy
// table in one place so tests can pin each branch.
export function shouldRequireBashConsent(
  command: string,
  mode: 'off' | 'dangerous' | 'always' | 'allowlist',
  allowlist: string[],
): boolean {
  if (mode === 'off') return false
  if (mode === 'always') return true
  if (mode === 'dangerous') {
    return DANGEROUS_PATTERNS.some((p) => p.test(command))
  }
  // allowlist: approve unless the command matches a user-supplied regex
  for (const raw of allowlist) {
    try {
      if (new RegExp(raw).test(command)) return false
    } catch { /* invalid regex → treat as non-match */ }
  }
  return true
}

function describeRisk(
  command: string,
  mode: 'off' | 'dangerous' | 'always' | 'allowlist',
): string {
  if (mode === 'dangerous') {
    return `Shell command looks destructive: ${command.slice(0, 200)}`
  }
  if (mode === 'always') {
    return `Shell command (consent mode: always): ${command.slice(0, 200)}`
  }
  return `Shell command not on allowlist: ${command.slice(0, 200)}`
}

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

    const mode = opts.settings?.bashConsentMode ?? 'dangerous'
    const allowlist = opts.settings?.bashAllowlist ?? []

    // Keep the progress-line warning for the dangerous case even when consent
    // is skipped, so the transcript still shows the command was scary.
    if (DANGEROUS_PATTERNS.some((p) => p.test(command))) {
      opts.onProgress?.(`⚠️  Potentially destructive command detected: ${command}`)
    }

    if (shouldRequireBashConsent(command, mode, allowlist)) {
      if (!opts.requestApproval) {
        // No bridge to the user (e.g. headless subagent). Fail closed rather
        // than silently executing a command the user would have blocked.
        return { error: 'Bash consent required but no approval channel is available.' }
      }
      const verdict = await opts.requestApproval({
        toolName: 'bash',
        reason: describeRisk(command, mode),
        input,
      })
      if (verdict !== 'approve') {
        return { error: 'User denied execution of this shell command.' }
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
