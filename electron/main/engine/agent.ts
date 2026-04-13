// Core agentic loop — adapted from Claude Code src/query.ts
// Stripped of all Anthropic telemetry, analytics, and feature gates.
// Implements: multi-turn tool execution, streaming events, skill injection.

import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import type {
  Message,
  AgentEvent,
  ToolDef,
  Session,
  NohiSettings,
} from './types'
import { ALL_TOOLS } from './tools/index'
import { mcpManager } from './mcp/client'
import { buildSkillInjection } from './skills/loader'
import { buildMemoryInjection } from './memory/store'
import type { Skill } from './types'

// ─── Model routing ─────────────────────────────────────────────────────────

const ANTHROPIC_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
]

function getAnthropicClient(settings: NohiSettings): Anthropic | null {
  if (!settings.anthropicApiKey) return null
  return new Anthropic({ apiKey: settings.anthropicApiKey })
}

// ─── Model capabilities ────────────────────────────────────────────────────

function getMaxTokens(model: string): number {
  // Anthropic models
  if (model.includes('opus-4')) return 32000
  if (model.includes('sonnet-4')) return 16000
  if (model.includes('haiku')) return 8096
  // OpenAI models
  if (model.includes('gpt-4.1')) return 32768
  if (model.includes('gpt-4o')) return 16384
  if (model.startsWith('o3') || model.startsWith('o1') || model.startsWith('o4')) return 16384
  // Kimi / Moonshot
  if (model.includes('moonshot')) return 8192
  // DeepSeek
  if (model.includes('deepseek')) return 8192
  // Minimax
  if (model.includes('abab')) return 8192
  return 16000
}

function supportsExtendedThinking(model: string): boolean {
  return model.includes('claude-3-7') || model.includes('claude-opus-4') || model.includes('claude-sonnet-4-6')
}

// ─── OpenAI-compatible providers ──────────────────────────────────────────

const OPENAI_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  kimi: 'https://api.moonshot.cn/v1',
  deepseek: 'https://api.deepseek.com/v1',
  minimax: 'https://api.minimax.chat/v1',
}

function detectProvider(model: string): string | null {
  if (ANTHROPIC_MODELS.some((m) => model.includes(m))) return 'anthropic'
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) return 'openai'
  if (model.startsWith('moonshot')) return 'kimi'
  if (model.includes('deepseek')) return 'deepseek'
  if (model.includes('abab')) return 'minimax'
  return null  // unknown — caller must handle
}

function getOpenAIApiKey(settings: NohiSettings, provider: string): string | null {
  if (provider === 'openai') return settings.openaiApiKey ?? null
  if (provider === 'kimi') return settings.kimiApiKey ?? null
  if (provider === 'deepseek') return settings.deepseekApiKey ?? null
  if (provider === 'minimax') return settings.minimaxApiKey ?? null
  return null
}

// Convert Anthropic-format tool defs to OpenAI function-calling format
// Adds `additionalProperties: false` for OpenAI strict mode compatibility
function toOpenAITools(tools: ToolDef[]) {
  return tools.map((t) => {
    // Deep-clone and patch schema for OpenAI compatibility
    const schema = JSON.parse(JSON.stringify(t.inputSchema))
    if (schema.type === 'object' && schema.additionalProperties === undefined) {
      schema.additionalProperties = false
    }
    // Ensure all required properties exist (OpenAI strict mode requires this)
    if (schema.properties && !schema.required) {
      schema.required = []
    }
    return {
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: schema,
        strict: false,  // don't enforce strict — allows flexible schemas
      },
    }
  })
}

// Convert internal messages to OpenAI-compatible message array
function toOpenAIMessages(messages: Message[], system: string): unknown[] {
  const result: unknown[] = [{ role: 'system', content: system }]
  for (const m of messages) {
    if (typeof m.content === 'string') {
      result.push({ role: m.role, content: m.content })
      continue
    }
    const blocks = m.content as unknown as Array<{ type: string; [k: string]: unknown }>
    if (m.role === 'user') {
      // tool_result blocks → individual tool messages
      const toolResults = blocks.filter((b) => b.type === 'tool_result')
      if (toolResults.length > 0) {
        for (const b of toolResults) {
          result.push({
            role: 'tool',
            tool_call_id: b['tool_use_id'],
            content: typeof b['content'] === 'string' ? b['content'] : JSON.stringify(b['content']),
          })
        }
        continue
      }
      // Check if there are image blocks (vision) — convert Anthropic format to OpenAI format
      const imageBlocks = blocks.filter((b) => b.type === 'image')
      const textBlocks = blocks.filter((b) => b.type === 'text')
      if (imageBlocks.length > 0) {
        const oaiContent: unknown[] = []
        for (const img of imageBlocks) {
          const src = img['source'] as { type: string; media_type?: string; data?: string } | undefined
          if (src?.type === 'base64' && src.data) {
            oaiContent.push({
              type: 'image_url',
              image_url: { url: `data:${src.media_type ?? 'image/png'};base64,${src.data}` },
            })
          }
        }
        for (const tb of textBlocks) {
          oaiContent.push({ type: 'text', text: tb['text'] ?? '' })
        }
        result.push({ role: 'user', content: oaiContent })
      } else {
        const text = textBlocks.map((b) => b['text'] ?? '').join('')
        result.push({ role: 'user', content: text })
      }
    } else {
      // assistant: text + optional tool_calls
      const text = blocks.filter((b) => b.type === 'text').map((b) => b['text'] ?? '').join('')
      const toolCalls = blocks
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({
          id: b['id'],
          type: 'function',
          function: { name: b['name'], arguments: JSON.stringify(b['input']) },
        }))
      // OpenAI requires content=null when assistant only makes tool calls
      const msg: Record<string, unknown> = { role: 'assistant', content: text || (toolCalls.length > 0 ? null : '') }
      if (toolCalls.length > 0) msg['tool_calls'] = toolCalls
      result.push(msg)
    }
  }
  return result
}

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
  const body: Record<string, unknown> = {
    model,
    messages: oaiMessages,
    stream: true,
  }
  // o-series models use max_completion_tokens; others use max_tokens
  if (isOSeries) {
    body['max_completion_tokens'] = maxTokens
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

async function loadClaudeMemory(workingDir: string): Promise<string> {
  const candidates = [
    join(workingDir, 'CLAUDE.md'),
    join(workingDir, '.claude', 'CLAUDE.md'),
  ]
  for (const p of candidates) {
    const abs = resolve(p)
    if (existsSync(abs)) {
      try {
        const content = await readFile(abs, 'utf-8')
        if (content.trim()) return `\n\n---\n# Memory (CLAUDE.md)\n${content.trim()}\n---`
      } catch { /* ignore */ }
    }
  }
  return ''
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

  const planInstructions = planMode
    ? `\n\nPLAN MODE is active: Before taking any action, output a numbered plan of what you intend to do. Wait for user confirmation before executing tools unless the user has explicitly said to proceed.`
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
- When you learn something important about the user or their project, save it with memory_write so future conversations can benefit.${planInstructions}${skillInjection}${memory}${persistentMemory}`
}

// ─── Main agent runner ─────────────────────────────────────────────────────

export async function* runAgent(
  session: Session,
  settings: NohiSettings,
  activeSkills: Skill[],
  onEvent: (event: AgentEvent) => void
): AsyncGenerator<AgentEvent> {
  const userMessages = session.messages
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

      // Execute tool calls
      const toolResultMsgs: unknown[] = []
      for (const tc of toolCallEntries) {
        let input: Record<string, unknown> = {}
        try { input = JSON.parse(tc.args) } catch { /* ignore */ }

        const tool = allTools.find((t) => t.name === tc.name)
        if (!tool) {
          yield { type: 'tool_result', id: tc.id, name: tc.name, output: `Unknown tool: ${tc.name}`, isError: true }
          toolResultMsgs.push({ role: 'tool', tool_call_id: tc.id, content: `Unknown tool: ${tc.name}` })
          continue
        }
        const result = await tool.call(input, { workingDir, settings, onProgress: (t) => onEvent({ type: 'text_delta', delta: t }) })
        const output = result.error ?? result.output ?? ''
        yield { type: 'tool_result', id: tc.id, name: tc.name, output, isError: !!result.error }
        toolResultMsgs.push({ role: 'tool', tool_call_id: tc.id, content: output })
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
      const streamParams: Anthropic.MessageStreamParams = {
        model: session.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: buildAnthropicToolDefs(allTools),
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
        }
      } else if (chunk.type === 'content_block_stop') {
        if (currentTextBlock) {
          assistantBlocks.push(currentTextBlock)
          currentTextBlock = null
        }
        if (currentToolBlock) {
          let input: Record<string, unknown> = {}
          try {
            input = JSON.parse(currentToolBlock.inputJson)
          } catch {
            // Malformed input
          }
          assistantBlocks.push({
            type: 'tool_use',
            id: currentToolBlock.id,
            name: currentToolBlock.name,
            input,
          })
          currentToolBlock = null
        }
      } else if (chunk.type === 'message_delta') {
        if (chunk.usage) {
          const event: AgentEvent = {
            type: 'message_complete',
            usage: {
              input_tokens: (chunk as unknown as { usage: { input_tokens: number; output_tokens: number } }).usage.input_tokens ?? 0,
              output_tokens: chunk.usage.output_tokens,
            },
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

    const toolResults: Array<{
      type: 'tool_result'
      tool_use_id: string
      content: string
      is_error?: boolean
    }> = []

    for (const toolCall of toolUseBlocks) {
      const tool = allTools.find((t) => t.name === toolCall.name)

      if (!tool) {
        const event: AgentEvent = {
          type: 'tool_result',
          id: toolCall.id,
          name: toolCall.name,
          output: `Unknown tool: ${toolCall.name}`,
          isError: true,
        }
        yield event
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: `Unknown tool: ${toolCall.name}`,
          is_error: true,
        })
        continue
      }

      const result = await tool.call(toolCall.input, {
        workingDir,
        settings,
        onProgress: (text) => onEvent({ type: 'text_delta', delta: text }),
      })

      const output = result.error ?? result.output ?? ''
      const isError = !!result.error

      const event: AgentEvent = {
        type: 'tool_result',
        id: toolCall.id,
        name: toolCall.name,
        output,
        isError,
      }
      yield event

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: output,
        is_error: isError || undefined,
      })
    }

    // Add tool results as user turn, continue loop
    messages.push({
      role: 'user',
      content: toolResults as unknown as Message['content'],
    })
  }

  yield { type: 'done' }
}
