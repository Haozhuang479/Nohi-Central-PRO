// Core agentic loop — adapted from Claude Code src/query.ts
// Stripped of all Anthropic telemetry, analytics, and feature gates.
// Implements: multi-turn tool execution, streaming events, skill injection.

import Anthropic from '@anthropic-ai/sdk'
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

// ─── Tool registry ─────────────────────────────────────────────────────────

function buildAnthropicToolDefs(tools: ToolDef[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  }))
}

// ─── System prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(settings: NohiSettings, skillInjection: string): string {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `You are Nohi Central PRO, a local AI operations assistant for e-commerce merchants.

Today is ${date}.
Working directory: ${settings.workingDir}

You have access to tools for file management, shell execution, web research, and platform integrations.

Guidelines:
- Be direct and actionable. Merchants are busy.
- When using tools, explain briefly what you're doing.
- For destructive file/shell operations, confirm with the user first.
- Prefer editing existing files over creating new ones.
- When researching, cite sources.${skillInjection}`
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
  const systemPrompt = buildSystemPrompt(settings, skillInjection)

  // Gather all tools: built-in + MCP
  const allTools = [...ALL_TOOLS, ...mcpManager.getToolDefs()]

  const messages: Message[] = userMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const isAnthropic = ANTHROPIC_MODELS.some((m) => session.model.includes(m.replace('claude-', '')))

  if (!isAnthropic) {
    yield { type: 'error', message: 'Only Anthropic models are supported in this version.' }
    yield { type: 'done' }
    return
  }

  const client = getAnthropicClient(settings)
  if (!client) {
    yield { type: 'error', message: 'Anthropic API key not set. Go to Settings to add it.' }
    yield { type: 'done' }
    return
  }

  // ─── Agentic loop (mirrors Claude Code query.ts structure) ───────────────
  let iteration = 0
  const MAX_ITERATIONS = 10

  while (iteration < MAX_ITERATIONS) {
    iteration++

    // Build the current message array for this turn
    const apiMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as Anthropic.MessageParam['content'],
    }))

    let stream: Awaited<ReturnType<typeof client.messages.stream>>
    try {
      stream = client.messages.stream({
        model: session.model,
        max_tokens: 8096,
        system: systemPrompt,
        tools: buildAnthropicToolDefs(allTools),
        messages: apiMessages,
      })
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
          onEvent(event)
        }
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta' && currentTextBlock) {
          currentTextBlock.text += chunk.delta.text
          const event: AgentEvent = { type: 'text_delta', delta: chunk.delta.text }
          yield event
          onEvent(event)
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
          onEvent(event)
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
        onEvent(event)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: `Unknown tool: ${toolCall.name}`,
          is_error: true,
        })
        continue
      }

      const result = await tool.call(toolCall.input, {
        workingDir: session.workingDir,
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
      onEvent(event)

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
  onEvent({ type: 'done' })
}
