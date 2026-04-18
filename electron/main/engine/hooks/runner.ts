// Hooks runner — execute shell commands in response to agent lifecycle events
// Mirrors Claude Code's hooks (PreToolUse, PostToolUse, Stop, UserPromptSubmit)
// Hooks are configured in NohiSettings.hooks.

import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { NohiSettings } from '../types'

export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'Stop' | 'UserPromptSubmit'

export interface HookConfig {
  /** Event to listen for */
  event: HookEvent
  /** Optional tool name filter (PreToolUse / PostToolUse only). Supports `*` and exact match. */
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
  stdout: string
  stderr: string
  exitCode: number
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
      return { blocked: true, results }
    }
  }
  return { blocked: false, results }
}

function matchesPattern(value: string, pattern: string): boolean {
  // Glob: * = any chars, ? = single char, [abc] = char class
  if (/[*?[]/.test(pattern)) {
    const escaped = pattern
      .replace(/[.+^${}()|\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    try {
      return new RegExp('^' + escaped + '$').test(value)
    } catch {
      return value === pattern
    }
  }
  return value === pattern
}

async function runHookCommand(command: string, context: HookContext): Promise<HookResult> {
  // Write context to a temp JSON file. Pass only its path via env var.
  // This avoids shell-injection risk that comes with putting structured data in env.
  const contextFile = join(tmpdir(), `nohi-hook-${randomUUID()}.json`)
  const contextJson: Record<string, unknown> = {
    workingDir: context.workingDir,
  }
  if (context.toolName) contextJson.toolName = context.toolName
  if (context.toolInput) contextJson.toolInput = context.toolInput
  if (context.toolOutput) contextJson.toolOutput = context.toolOutput.slice(0, 32_000)
  if (context.userPrompt) contextJson.userPrompt = context.userPrompt

  try {
    await writeFile(contextFile, JSON.stringify(contextJson), 'utf-8')
  } catch {
    return { stdout: '', stderr: 'Failed to write hook context file', exitCode: 1, timedOut: false }
  }

  return new Promise((resolve) => {
    // Only safe scalar env vars — never structured data.
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      NOHI_HOOK_CONTEXT_FILE: contextFile,
      NOHI_WORKING_DIR: context.workingDir,
    }
    if (context.toolName) env.NOHI_TOOL_NAME = sanitizeEnv(context.toolName)

    const proc = spawn('sh', ['-c', command], {
      cwd: context.workingDir,
      env,
    })

    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false

    const cleanup = (): void => {
      unlink(contextFile).catch(() => {})
    }

    // Hard kill after timeout — Node's spawn `timeout` only sends SIGTERM
    const killTimer = setTimeout(() => {
      timedOut = true
      try { proc.kill('SIGKILL') } catch { /* already dead */ }
    }, HOOK_TIMEOUT_MS)

    proc.stdout?.on('data', (chunk) => { stdout += chunk.toString() })
    proc.stderr?.on('data', (chunk) => { stderr += chunk.toString() })

    proc.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(killTimer)
      cleanup()
      resolve({
        stdout,
        stderr,
        exitCode: code ?? (signal ? 1 : 0),
        timedOut,
      })
    })

    proc.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(killTimer)
      cleanup()
      resolve({
        stdout: '',
        stderr: String(err),
        exitCode: 1,
        timedOut: false,
      })
    })
  })
}

// Strip control chars + shell metacharacters from values that go into env.
// The shell still evaluates env vars, so we must keep them safe.
function sanitizeEnv(value: string): string {
  return value.replace(/[\x00-\x1f`$"'\\]/g, '').slice(0, 200)
}
