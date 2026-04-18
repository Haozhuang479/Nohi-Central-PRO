// Shared tool-dispatch helper used by both the Anthropic and OpenAI branches of agent.ts.
// Replaces ~65 LOC of mirrored logic for: tool lookup, PreToolUse hook, execution,
// PostToolUse hook (fire-and-forget), and the todo_write side-effect emission.
//
// Returns enough information that each branch can construct its provider-specific
// tool-result message shape (Anthropic toolResults vs OpenAI toolResultMsgs).

import type { AgentEvent, NohiSettings, ToolDef } from '../types'
import { runHooks } from '../hooks/runner'

export interface DispatchInput {
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
}

export interface DispatchOutcome {
  /** Final text output (or error message) shown to the user / fed back to the model. */
  output: string
  isError: boolean
  /** Side events that callers should yield in order. */
  events: AgentEvent[]
}

/**
 * Run a single tool call end-to-end:
 *  1. Look up the tool in `allTools`. Unknown tool → error event + result.
 *  2. Run PreToolUse hooks. Non-zero exit → blocked, error event + result, no execution.
 *  3. Execute the tool, capturing onProgress as text_delta events.
 *  4. Yield tool_result event.
 *  5. If todo_write succeeded, yield todos_updated.
 *  6. Fire PostToolUse hooks (fire-and-forget; never blocks the loop).
 */
export async function dispatchToolCall(
  call: DispatchInput,
  ctx: {
    allTools: ToolDef[]
    workingDir: string
    settings: NohiSettings
    onEvent: (e: AgentEvent) => void
  },
): Promise<DispatchOutcome> {
  const events: AgentEvent[] = []

  const tool = ctx.allTools.find((t) => t.name === call.toolName)
  if (!tool) {
    const msg = `Unknown tool: ${call.toolName}`
    events.push({ type: 'tool_result', id: call.toolCallId, name: call.toolName, output: msg, isError: true })
    return { output: msg, isError: true, events }
  }

  // PreToolUse — block on non-zero exit
  const preHook = await runHooks('PreToolUse', {
    toolName: call.toolName,
    toolInput: call.input,
    workingDir: ctx.workingDir,
  }, ctx.settings)
  if (preHook.blocked) {
    const blockMsg = preHook.results.map((r) => r.stderr || r.stdout).join('\n').trim()
      || 'Blocked by PreToolUse hook'
    events.push({ type: 'tool_result', id: call.toolCallId, name: call.toolName, output: blockMsg, isError: true })
    return { output: blockMsg, isError: true, events }
  }

  // Execute. Tool's onProgress is forwarded as text_delta events.
  const result = await tool.call(call.input, {
    workingDir: ctx.workingDir,
    settings: ctx.settings,
    onProgress: (text) => ctx.onEvent({ type: 'text_delta', delta: text }),
  })
  const output = result.error ?? result.output ?? ''
  const isError = !!result.error

  events.push({ type: 'tool_result', id: call.toolCallId, name: call.toolName, output, isError })

  // todo_write side effect: emit the structured todos so the renderer can update its UI.
  if (call.toolName === 'todo_write' && !isError) {
    const todos = (call.input.todos ?? []) as Array<{ content: string; activeForm: string; status: 'pending' | 'in_progress' | 'completed' }>
    events.push({ type: 'todos_updated', todos })
  }

  // PostToolUse hooks fire-and-forget; never block the agent loop.
  runHooks('PostToolUse', {
    toolName: call.toolName,
    toolInput: call.input,
    toolOutput: output,
    workingDir: ctx.workingDir,
  }, ctx.settings).catch(() => { /* logged inside runHooks */ })

  return { output, isError, events }
}
