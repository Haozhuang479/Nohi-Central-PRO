// Hooks runner — execute shell commands in response to agent lifecycle events
// Mirrors Claude Code's hooks (PreToolUse, PostToolUse, Stop, UserPromptSubmit)
// Hooks are configured in NohiSettings.hooks.

import { spawn } from 'child_process'
import type { NohiSettings } from '../types'

export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'Stop' | 'UserPromptSubmit'

export interface HookConfig {
  /** Event to listen for */
  event: HookEvent
  /** Optional tool name filter (PreToolUse / PostToolUse only) */
  matcher?: string
  /** Shell command to execute */
  command: string
  /** Description shown in UI */
  description?: string
  /** Whether the hook is enabled */
  enabled?: boolean
}

export interface HookContext {
  toolName?: string
  toolInput?: Record<string, unknown>
  toolOutput?: string
  userPrompt?: string
  workingDir: string
}

export interface HookResult {
  /** Stdout from the hook command */
  stdout: string
  /** Stderr from the hook command */
  stderr: string
  /** Exit code; non-zero means the hook BLOCKS the action */
  exitCode: number
  /** True if hook timed out */
  timedOut: boolean
}

const HOOK_TIMEOUT_MS = 10_000

/**
 * Run all hooks matching the given event.
 * Returns the first blocking result (exitCode != 0), or null if all pass.
 */
export async function runHooks(
  event: HookEvent,
  context: HookContext,
  settings: NohiSettings,
): Promise<{ blocked: boolean; results: HookResult[] }> {
  const hooks = (settings.hooks ?? []).filter(
    (h) =>
      h.enabled !== false &&
      h.event === event &&
      (!h.matcher || h.matcher === '*' || (context.toolName && matchesPattern(context.toolName, h.matcher))),
  )

  if (hooks.length === 0) return { blocked: false, results: [] }

  const results: HookResult[] = []
  for (const hook of hooks) {
    const result = await runHookCommand(hook.command, context)
    results.push(result)
    if (result.exitCode !== 0) {
      // Blocking hook — stop processing
      return { blocked: true, results }
    }
  }
  return { blocked: false, results }
}

function matchesPattern(value: string, pattern: string): boolean {
  // Support simple glob: * matches anything, exact otherwise
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(value)
  }
  return value === pattern
}

async function runHookCommand(command: string, context: HookContext): Promise<HookResult> {
  return new Promise((resolve) => {
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      NOHI_WORKING_DIR: context.workingDir,
    }
    if (context.toolName) env.NOHI_TOOL_NAME = context.toolName
    if (context.userPrompt) env.NOHI_USER_PROMPT = context.userPrompt
    if (context.toolInput) env.NOHI_TOOL_INPUT = JSON.stringify(context.toolInput)
    if (context.toolOutput) env.NOHI_TOOL_OUTPUT = context.toolOutput.slice(0, 8000)

    const proc = spawn('sh', ['-c', command], {
      cwd: context.workingDir,
      env,
      timeout: HOOK_TIMEOUT_MS,
    })

    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (chunk) => { stdout += chunk.toString() })
    proc.stderr?.on('data', (chunk) => { stderr += chunk.toString() })

    proc.on('close', (code, signal) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? (signal ? 1 : 0),
        timedOut: signal === 'SIGTERM',
      })
    })

    proc.on('error', (err) => {
      resolve({
        stdout: '',
        stderr: String(err),
        exitCode: 1,
        timedOut: false,
      })
    })
  })
}
