// Core agentic loop — adapted from Claude Code src/query.ts
// Stripped of all Anthropic telemetry, analytics, and feature gates.
// Implements: multi-turn tool execution, streaming events, skill injection.

import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { homedir } from 'os'
import type {
  Message,
  AgentEvent,
  ToolDef,
  Session,
  NohiSettings,
} from './types'
import { ALL_TOOLS } from './tools/index'
import { registerSubagentRunner } from './tools/task'
import { registerBulkRunner } from './tools/bulkApply'
import { runHooks } from './hooks/runner'
import { dispatchToolCall } from './agent/dispatch'
import {
  OPENAI_BASE_URLS,
  detectProvider,
  getAnthropicClient,
  getMaxTokens,
  getOpenAIApiKey,
  supportsExtendedThinking,
  toOpenAIMessages,
  toOpenAITools,
} from './agent/providers'
import { record as telemetry } from './lib/telemetry'
import { mcpManager } from './mcp/client'
import { buildSkillInjection } from './skills/loader'
import { buildMemoryInjection } from './memory/store'
import type { Skill } from './types'

// Stream an OpenAI-compatible chat completion, yielding parsed events
async function* streamOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  oaiMessages: unknown[],
  oaiTools: ReturnType<typeof toOpenAITools>,
  maxTokens: number,
): AsyncGenerator<{
  type: 'text' | 'tool_start' | 'tool_args' | 'finish'
  delta?: string
  tcIndex?: number
  tcId?: string
  tcName?: string
  argsChunk?: string
  finishReason?: string
}> {
  const isOSeries = model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')
  const isGpt5 = model.startsWith('gpt-5')
  const body: Record<string, unknown> = {
    model,
    messages: oaiMessages,
    stream: true,
  }
  // o-series models use max_completion_tokens; others use max_tokens
  if (isOSeries || isGpt5) {
    body['max_completion_tokens'] = maxTokens
    // Reasoning models accept reasoning_effort: minimal | low | medium | high
    body['reasoning_effort'] = 'medium'
  } else {
    body['max_tokens'] = maxTokens
  }
  if (oaiTools.length > 0 && !isOSeries) {
    // o-series doesn't support tool_choice
    body['tools'] = oaiTools
    body['tool_choice'] = 'auto'
  } else if (oaiTools.length > 0) {
    body['tools'] = oaiTools
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    console.error(`[Agent] OpenAI API error: ${resp.status}`, errText.slice(0, 300))
    throw new Error(`${resp.status}: ${errText}`)
  }

  const reader = resp.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const s = line.trim()
      if (!s.startsWith('data: ')) continue
      const payload = s.slice(6)
      if (payload === '[DONE]') { yield { type: 'finish', finishReason: 'stop' }; return }
      try {
        const chunk = JSON.parse(payload)
        const choice = chunk.choices?.[0]
        if (!choice) continue
        const delta = choice.delta ?? {}
        if (typeof delta.content === 'string' && delta.content) yield { type: 'text', delta: delta.content }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            if (tc.id) yield { type: 'tool_start', tcIndex: tc.index, tcId: tc.id, tcName: tc.function?.name ?? '' }
            if (tc.function?.arguments) yield { type: 'tool_args', tcIndex: tc.index, argsChunk: tc.function.arguments }
          }
        }
        if (choice.finish_reason) yield { type: 'finish', finishReason: choice.finish_reason }
      } catch { /* skip malformed chunk */ }
    }
  }
}

// ─── CLAUDE.md memory injection ───────────────────────────────────────────
//
// Reads (in priority order):
//   1. <workingDir>/CLAUDE.md                — per-project
//   2. <workingDir>/.claude/CLAUDE.md        — per-project, hidden dir
//   3. ~/.claude/CLAUDE.md                   — user-global (v2.9.2)
// Each source is capped at PER_FILE_CAP bytes and the total injection is
// capped at TOTAL_CAP bytes. Exceeding either limit appends a "[truncated]"
// marker so the model knows there's more it's not seeing. Prevents a huge
// CLAUDE.md from silently burning every turn's context budget.

const CLAUDE_MD_PER_FILE_CAP = 50_000   // ~12.5k tokens per source
const CLAUDE_MD_TOTAL_CAP    = 150_000  // ~37k tokens total

async function loadClaudeMemory(workingDir: string): Promise<string> {
  const candidates: Array<{ path: string; label: string }> = [
    { path: join(workingDir, 'CLAUDE.md'),              label: 'project CLAUDE.md' },
    { path: join(workingDir, '.claude', 'CLAUDE.md'),   label: 'project .claude/CLAUDE.md' },
    { path: join(homedir(), '.claude', 'CLAUDE.md'),    label: 'user ~/.claude/CLAUDE.md' },
  ]
  const sections: string[] = []
  let budget = CLAUDE_MD_TOTAL_CAP
  const seen = new Set<string>()
  for (const { path, label } of candidates) {
    if (budget <= 0) break
    const abs = resolve(path)
    // De-dup when workingDir === homedir (the same file would appear twice).
    if (seen.has(abs)) continue
    seen.add(abs)
    if (!existsSync(abs)) continue
    try {
      let content = (await readFile(abs, 'utf-8')).trim()
      if (!content) continue
      let truncatedFile = false
      if (content.length > CLAUDE_MD_PER_FILE_CAP) {
        content = content.slice(0, CLAUDE_MD_PER_FILE_CAP)
        truncatedFile = true
      }
      if (content.length > budget) {
        content = content.slice(0, budget)
        truncatedFile = true
      }
      budget -= content.length
      const footer = truncatedFile ? '\n[truncated — file exceeded size cap]' : ''
      sections.push(`## ${label}\n${content}${footer}`)
    } catch { /* ignore */ }
  }
  if (sections.length === 0) return ''
  return `\n\n---\n# Memory (CLAUDE.md)\n${sections.join('\n\n')}\n---`
}

// ─── Tool registry ─────────────────────────────────────────────────────────

function buildAnthropicToolDefs(tools: ToolDef[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  }))
}

// ─── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(
  settings: NohiSettings,
  skillInjection: string,
  memory: string,
  persistentMemory: string,
  planMode: boolean,
  workingDir: string,
): string {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // v3.0.0: plan mode is now a hard gate. The Nohi UI intercepts your first
  // response of each send and shows the user a modal with (1) your plan text
  // and (2) the tools you intended to call — before any tool executes.
  const planInstructions = planMode
    ? `\n\nPLAN MODE is active. The Nohi UI will intercept your first response and show the user a modal with your plan text + the tools you intend to call. Only after the user clicks "Approve & Execute" will those tools run.

- Begin your first response with a short plain-prose description of what you intend to do and why. Then make the tool calls that accomplish it — both will go into the same response and be shown together.
- If the user clicks "Revise", they'll reply with feedback; you'll get another turn to produce a new plan + tools. The modal appears again.
- If the user clicks "Cancel" or dismisses, this send ends with no tools executed.
- If the task has no side effects (answering a question, summarising, explaining) and you don't need tools, just answer directly. The modal only appears when you call tools.`
    : ''

  return `You are Nohi Central PRO, a local AI operations assistant for e-commerce merchants.

Today is ${date}.
Working directory: ${workingDir}

You have access to tools for file management, shell execution, web research, and platform integrations.

Guidelines:
- Be direct and actionable. Merchants are busy.
- When using tools, explain briefly what you're doing.
- For destructive file/shell operations, confirm with the user first.
- Prefer editing existing files over creating new ones.
- When researching, cite sources.

Persistent memory (cross-conversation):
- Use \`memory_read\` at the start of a new topic to recall relevant facts.
- Use \`memory_write\` whenever you learn something durable about the user, their store, brand, products, preferences, recurring tasks, or non-obvious decisions. Save short factual entries — the user's name/role, store URL, brand voice, key product SKUs, integrations they use, and any "always do X" / "never do Y" rules.
- Categorize each memory: user / project / feedback / reference. Lead with the fact, then a short Why and How-to-apply line when useful.
- Don't save trivia, ephemeral state, or anything derivable from the current code/session. Don't ask permission to save — just save it.

Task management with \`todo_write\`:
- Use proactively when (a) the task has 3+ steps, (b) the user gave multiple tasks, or (c) you want to demonstrate progress.
- Each todo has \`content\` (imperative, e.g. "Run tests"), \`activeForm\` (continuous, e.g. "Running tests"), and \`status\` (pending|in_progress|completed).
- Mark exactly ONE task as in_progress at a time. Update status immediately as you complete each item — do not batch.
- Skip for trivial single-step work.

Subagents with \`task\`:
- Spawn a subagent for focused work that needs many tool calls (e.g. exploring a large codebase, multi-source research). The subagent has its own tool loop and returns a single summary.
- Provide a clear, self-contained \`prompt\` — the subagent has no memory of this conversation.
- Don't use for trivial work that's faster to do inline.${planInstructions}${skillInjection}${memory}${persistentMemory}`
}

// ─── Main agent runner ─────────────────────────────────────────────────────

export async function* runAgent(
  session: Session,
  settings: NohiSettings,
  activeSkills: Skill[],
  onEvent: (event: AgentEvent) => void,
  /**
   * Optional hook used by the main process to ask the renderer for per-tool
   * consent. Raw form (takes a toolUseId so child dispatches can re-bind).
   * Subagents spawned via the Task / bulk_apply tools currently run without
   * consent — they'll inherit it in a follow-up change.
   */
  requestApproval?: (
    toolUseId: string,
    req: { toolName: string; reason: string; input: unknown },
  ) => Promise<'approve' | 'deny'>,
  /**
   * Plan-mode approval gate. When session.planMode is on and the model's
   * first iteration produces tool calls, the loop pauses on this promise
   * until the user chooses approve/deny/revise in the renderer modal. Both
   * Anthropic and OpenAI branches hit the gate identically — see the
   * "plan-mode gate" blocks below. Subagents never receive this (plan mode
   * is a session-level concern, not a subagent concern).
   */
  requestPlanApproval?: (req: {
    sessionId: string
    planText: string
    toolPreview: Array<{ name: string; input: unknown }>
  }) => Promise<{ kind: 'approve' } | { kind: 'deny' } | { kind: 'revise'; reviseText: string }>,
): AsyncGenerator<AgentEvent> {
  // ── Telemetry: session bookkeeping (opt-in; no-op when disabled) ────────
  const sessionStart = Date.now()
  let tokensIn = 0
  let tokensOut = 0
  let toolCalls = 0
  let toolErrors = 0
  const telemetryProvider = detectProvider(session.model) ?? 'unknown'
  telemetry({ event: 'session_start', sessionId: session.id, model: session.model, provider: telemetryProvider })
  // Register self as the subagent runner so the Task tool can spawn nested agents
  registerSubagentRunner(runAgent, activeSkills)
  registerBulkRunner(runAgent, activeSkills)

  const userMessages = session.messages

  // UserPromptSubmit hooks — fire once per agent run with the latest user prompt
  const lastUserMsg = userMessages[userMessages.length - 1]
  const lastUserText = typeof lastUserMsg?.content === 'string'
    ? lastUserMsg.content
    : (lastUserMsg?.content as Array<{ type: string; text?: string }>)
        ?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(' ') ?? ''
  const promptHook = await runHooks('UserPromptSubmit', {
    userPrompt: lastUserText,
    workingDir: session.workingDir || settings.workingDir,
  }, settings)
  if (promptHook.blocked) {
    const blockMsg = promptHook.results.map((r) => r.stderr || r.stdout).join('\n').trim() || 'Blocked by UserPromptSubmit hook'
    yield { type: 'error', message: blockMsg }
    yield { type: 'done' }
    return
  }
  const lastUser = userMessages[userMessages.length - 1]
  const userText =
    typeof lastUser.content === 'string'
      ? lastUser.content
      : (lastUser.content as Array<{ type: string; text?: string }>)
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join(' ')

  const skillInjection = buildSkillInjection(activeSkills, userText)
  const workingDir = session.workingDir || settings.workingDir
  const memory = await loadClaudeMemory(workingDir)
  const persistentMemory = await buildMemoryInjection()
  const systemPrompt = buildSystemPrompt(settings, skillInjection, memory, persistentMemory, !!session.planMode, workingDir)

  // Gather all tools: built-in + MCP
  const allTools = [...ALL_TOOLS, ...mcpManager.getToolDefs()]

  const messages: Message[] = userMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const provider = detectProvider(session.model)
  if (!provider) {
    yield { type: 'error', message: `Unknown model "${session.model}". Please select a supported model in the top bar.` }
    yield { type: 'done' }
    return
  }
  const isAnthropic = provider === 'anthropic'

  // ─── OpenAI-compatible branch ──────────────────────────────────────────
  if (!isAnthropic) {
    const baseUrl = OPENAI_BASE_URLS[provider]
    if (!baseUrl) {
      yield { type: 'error', message: `Unsupported provider "${provider}" for model: ${session.model}` }
      yield { type: 'done' }
      return
    }
    const apiKey = getOpenAIApiKey(settings, provider)
    if (!apiKey) {
      yield { type: 'error', message: `${provider} API key not set. Go to Settings to add it.` }
      yield { type: 'done' }
      return
    }

    const oaiTools = toOpenAITools(allTools)
    let oaiMessages = toOpenAIMessages(messages, systemPrompt)
    let iteration = 0
    const MAX_ITERATIONS = 20
    const maxTokens = getMaxTokens(session.model)

    console.log(`[Agent] OpenAI branch: provider=${provider}, model=${session.model}, tools=${oaiTools.length}, maxTokens=${maxTokens}`)

    // Accumulate tool calls across chunks: index → {id, name, args}
    const pendingToolCalls: Record<number, { id: string; name: string; args: string }> = {}

    while (iteration < MAX_ITERATIONS) {
      iteration++
      pendingToolCalls && Object.keys(pendingToolCalls).forEach((k) => delete pendingToolCalls[+k])

      let assistantText = ''
      let finishReason = ''

      try {
        for await (const ev of streamOpenAI(baseUrl, apiKey, session.model, oaiMessages, oaiTools, maxTokens)) {
          if (ev.type === 'text' && ev.delta) {
            assistantText += ev.delta
            yield { type: 'text_delta', delta: ev.delta }
          } else if (ev.type === 'tool_start' && ev.tcId != null) {
            const idx = ev.tcIndex ?? 0
            pendingToolCalls[idx] = { id: ev.tcId, name: ev.tcName ?? '', args: '' }
            yield { type: 'tool_start', id: ev.tcId, name: ev.tcName ?? '', input: {} }
          } else if (ev.type === 'tool_args' && ev.tcIndex != null) {
            const tc = pendingToolCalls[ev.tcIndex]
            if (tc) tc.args += ev.argsChunk ?? ''
          } else if (ev.type === 'finish') {
            finishReason = ev.finishReason ?? 'stop'
          }
        }
      } catch (err: unknown) {
        const e = err as { message?: string }
        yield { type: 'error', message: e.message ?? 'API error' }
        yield { type: 'done' }
        return
      }

      // Build assistant message for history
      const toolCallEntries = Object.values(pendingToolCalls)
      console.log(`[Agent] Iteration ${iteration}: finishReason=${finishReason}, toolCalls=${toolCallEntries.length}, textLen=${assistantText.length}`)
      if (toolCallEntries.length > 0) {
        console.log(`[Agent] Tool calls:`, toolCallEntries.map(tc => `${tc.name}(${tc.args.slice(0, 80)})`))
      }
      const assistantMsg: Record<string, unknown> = { role: 'assistant' }
      // OpenAI requires content=null when assistant only makes tool calls
      if (toolCallEntries.length > 0) {
        assistantMsg['content'] = assistantText || null
        assistantMsg['tool_calls'] = toolCallEntries.map((tc) => ({
          id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.args },
        }))
      } else {
        assistantMsg['content'] = assistantText
      }
      oaiMessages = [...oaiMessages, assistantMsg]

      // If the model didn't produce any tool calls, we're done
      if (toolCallEntries.length === 0) break

      // ─── Plan-mode gate (OpenAI branch) ────────────────────────────────
      // Only gate the first iteration of each send. The user's approve
      // decision passes the whole tool batch through; revise appends their
      // feedback as a new user turn and loops back to re-plan; deny ends
      // the run. Text-only responses never hit this gate (caught above).
      if (session.planMode && iteration === 1 && requestPlanApproval) {
        const decision = await requestPlanApproval({
          sessionId: session.id,
          planText: assistantText,
          toolPreview: toolCallEntries.map((tc) => {
            let input: Record<string, unknown> = {}
            try { input = JSON.parse(tc.args || '{}') } catch { /* preview only */ }
            return { name: tc.name, input }
          }),
        })
        if (decision.kind === 'deny') {
          yield { type: 'done' }
          return
        }
        if (decision.kind === 'revise') {
          // Assistant message (with its tool_calls) was already appended to
          // oaiMessages above — preserve it for model context. Append the
          // user's revision as the next turn so the next iteration sees the
          // full plan → revise arc and regenerates.
          oaiMessages = [...oaiMessages, { role: 'user', content: decision.reviseText }]
          continue
        }
        // 'approve' — fall through to tool dispatch
      }

      // Execute tool calls
      const toolResultMsgs: unknown[] = []
      for (const tc of toolCallEntries) {
        let input: Record<string, unknown> = {}
        let parseError: string | null = null
        try {
          input = JSON.parse(tc.args || '{}')
        } catch (err) {
          parseError = err instanceof Error ? err.message : String(err)
        }
        if (parseError) {
          const msg = `Tool input was malformed JSON (${parseError}). Raw: ${tc.args.slice(0, 500)}`
          yield { type: 'tool_result', id: tc.id, name: tc.name, output: msg, isError: true }
          toolResultMsgs.push({ role: 'tool', tool_call_id: tc.id, content: msg })
          continue
        }

        const toolStart = Date.now()
        const outcome = await dispatchToolCall(
          { toolCallId: tc.id, toolName: tc.name, input },
          { allTools, workingDir, settings, onEvent, requestApproval },
        )
        toolCalls++
        if (outcome.isError) toolErrors++
        telemetry({ event: 'tool_call', sessionId: session.id, name: tc.name, durationMs: Date.now() - toolStart, isError: outcome.isError })
        for (const ev of outcome.events) yield ev
        toolResultMsgs.push({ role: 'tool', tool_call_id: tc.id, content: outcome.output })
      }
      oaiMessages = [...oaiMessages, ...toolResultMsgs]
    }

    yield { type: 'done' }
    return
  }

  // ─── Anthropic branch (below) ──────────────────────────────────────────
  const client = getAnthropicClient(settings)
  if (!client) {
    yield { type: 'error', message: 'Anthropic API key not set. Go to Settings to add it.' }
    yield { type: 'done' }
    return
  }

  // ─── Agentic loop (mirrors Claude Code query.ts structure) ───────────────
  let iteration = 0
  const MAX_ITERATIONS = 20
  const maxTokens = getMaxTokens(session.model)

  while (iteration < MAX_ITERATIONS) {
    iteration++

    // Build the current message array for this turn
    const apiMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as Anthropic.MessageParam['content'],
    }))

    let stream: Awaited<ReturnType<typeof client.messages.stream>>
    try {
      // Build cache-controlled system prompt (saves ~90% on repeated turns)
      const cachedSystem = [
        { type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } },
      ]
      // Cache-control the last tool def too — caches the entire tool definitions block
      const toolDefs = buildAnthropicToolDefs(allTools)
      const cachedTools = toolDefs.length > 0
        ? toolDefs.map((t, i) => i === toolDefs.length - 1
          ? ({ ...t, cache_control: { type: 'ephemeral' as const } })
          : t)
        : toolDefs

      const streamParams: Anthropic.MessageStreamParams = {
        model: session.model,
        max_tokens: maxTokens,
        system: cachedSystem,
        tools: cachedTools as Anthropic.Tool[],
        messages: apiMessages,
      }
      // Enable extended thinking for supported models when plan mode is active
      if (session.planMode && supportsExtendedThinking(session.model)) {
        ;(streamParams as unknown as Record<string, unknown>)['thinking'] = { type: 'enabled', budget_tokens: Math.floor(maxTokens * 0.4) }
      }
      stream = client.messages.stream(streamParams)
    } catch (err: unknown) {
      const e = err as { message?: string }
      yield { type: 'error', message: e.message ?? 'API error' }
      yield { type: 'done' }
      return
    }

    // Stream text deltas
    const assistantBlocks: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    > = []

    let currentTextBlock: { type: 'text'; text: string } | null = null
    let currentToolBlock: {
      type: 'tool_use'
      id: string
      name: string
      inputJson: string
    } | null = null

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start') {
        if (chunk.content_block.type === 'text') {
          currentTextBlock = { type: 'text', text: '' }
        } else if (chunk.content_block.type === 'tool_use') {
          currentToolBlock = {
            type: 'tool_use',
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            inputJson: '',
          }
          const event: AgentEvent = {
            type: 'tool_start',
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            input: {},
          }
          yield event
        }
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta' && currentTextBlock) {
          currentTextBlock.text += chunk.delta.text
          const event: AgentEvent = { type: 'text_delta', delta: chunk.delta.text }
          yield event
        } else if (chunk.delta.type === 'input_json_delta' && currentToolBlock) {
          currentToolBlock.inputJson += chunk.delta.partial_json
        } else if ((chunk.delta as { type: string; thinking?: string }).type === 'thinking_delta') {
          const thinkingText = (chunk.delta as { thinking?: string }).thinking ?? ''
          if (thinkingText) yield { type: 'thinking_delta', delta: thinkingText }
        }
      } else if (chunk.type === 'content_block_stop') {
        if (currentTextBlock) {
          assistantBlocks.push(currentTextBlock)
          currentTextBlock = null
        }
        if (currentToolBlock) {
          let input: Record<string, unknown> = {}
          let parseError: string | null = null
          try {
            // An empty inputJson means the tool takes no arguments — that's fine, treat as {}.
            const raw = currentToolBlock.inputJson.trim() || '{}'
            input = JSON.parse(raw)
          } catch (err) {
            parseError = err instanceof Error ? err.message : String(err)
            // Surface to the user via a tool_result event so the agent loop can self-correct
            yield {
              type: 'tool_result',
              id: currentToolBlock.id,
              name: currentToolBlock.name,
              output: `Tool input was malformed JSON (${parseError}). Raw input was: ${currentToolBlock.inputJson.slice(0, 500)}`,
              isError: true,
            }
          }
          assistantBlocks.push({
            type: 'tool_use',
            id: currentToolBlock.id,
            name: currentToolBlock.name,
            input: parseError ? { __malformed: true, __error: parseError } : input,
          })
          currentToolBlock = null
        }
      } else if (chunk.type === 'message_delta') {
        if (chunk.usage) {
          const usageIn = (chunk as unknown as { usage: { input_tokens: number; output_tokens: number } }).usage.input_tokens ?? 0
          const usageOut = chunk.usage.output_tokens
          tokensIn += usageIn
          tokensOut += usageOut
          const event: AgentEvent = {
            type: 'message_complete',
            usage: { input_tokens: usageIn, output_tokens: usageOut },
          }
          yield event
        }
      }
    }

    // Add assistant turn to messages
    const finalMsg = await stream.finalMessage()
    messages.push({ role: 'assistant', content: finalMsg.content as unknown as Message['content'] })

    // Check stop reason
    if (finalMsg.stop_reason === 'end_turn') {
      // No tool calls — we're done
      break
    }

    if (finalMsg.stop_reason !== 'tool_use') {
      // Unexpected stop reason
      break
    }

    // ─── Execute tool calls ───────────────────────────────────────────────
    const toolUseBlocks = assistantBlocks.filter((b) => b.type === 'tool_use') as Array<{
      type: 'tool_use'
      id: string
      name: string
      input: Record<string, unknown>
    }>

    // ─── Plan-mode gate (Anthropic branch) ────────────────────────────────
    // Only on the first iteration of each send. Same semantics as the
    // OpenAI branch: approve → dispatch; revise → append user revision and
    // loop back; deny → done. The assistant message (with its tool_use
    // blocks) was already pushed to `messages` at line 630 above, so the
    // revise branch can just append a user turn and continue.
    if (session.planMode && iteration === 1 && toolUseBlocks.length > 0 && requestPlanApproval) {
      const planText = (assistantBlocks as Array<{ type: string; text?: string }>)
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
      const decision = await requestPlanApproval({
        sessionId: session.id,
        planText,
        toolPreview: toolUseBlocks.map((b) => ({ name: b.name, input: b.input })),
      })
      if (decision.kind === 'deny') {
        yield { type: 'done' }
        return
      }
      if (decision.kind === 'revise') {
        messages.push({ role: 'user', content: decision.reviseText })
        continue
      }
      // 'approve' — fall through to dispatch
    }

    const toolResults: Array<{
      type: 'tool_result'
      tool_use_id: string
      content: string
      is_error?: boolean
    }> = []

    for (const toolCall of toolUseBlocks) {
      const toolStart = Date.now()
      const outcome = await dispatchToolCall(
        { toolCallId: toolCall.id, toolName: toolCall.name, input: toolCall.input },
        { allTools, workingDir, settings, onEvent, requestApproval },
      )
      toolCalls++
      if (outcome.isError) toolErrors++
      telemetry({ event: 'tool_call', sessionId: session.id, name: toolCall.name, durationMs: Date.now() - toolStart, isError: outcome.isError })
      for (const ev of outcome.events) yield ev
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: outcome.output,
        is_error: outcome.isError || undefined,
      })
    }

    // Add tool results as user turn, continue loop
    messages.push({
      role: 'user',
      content: toolResults as unknown as Message['content'],
    })
  }

  // Stop hooks — observation only, fired after the agent loop completes
  runHooks('Stop', { workingDir: session.workingDir || settings.workingDir }, settings).catch(() => {})

  telemetry({
    event: 'session_end',
    sessionId: session.id,
    durationMs: Date.now() - sessionStart,
    tokensIn, tokensOut, toolCalls, toolErrors,
  })

  yield { type: 'done' }
}
