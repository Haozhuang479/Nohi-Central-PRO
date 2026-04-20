// Provider / model routing helpers for the agent loop.
//
// Extracted from agent.ts (Phase E) because these are all pure functions
// with no dependency on runAgent state — perfect candidates for isolation.
// Keeping them out of agent.ts makes the big async-generator there easier
// to read and lets tests cover the routing table directly.

import Anthropic from '@anthropic-ai/sdk'
import type { Message, NohiSettings, ToolDef } from '../types'

export const ANTHROPIC_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
]

export const OPENAI_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  kimi: 'https://api.moonshot.cn/v1',
  deepseek: 'https://api.deepseek.com/v1',
  minimax: 'https://api.minimax.chat/v1',
}

export function getAnthropicClient(settings: NohiSettings): Anthropic | null {
  if (!settings.anthropicApiKey) return null
  return new Anthropic({ apiKey: settings.anthropicApiKey })
}

/** Max output tokens per model family. */
export function getMaxTokens(model: string): number {
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

export function supportsExtendedThinking(model: string): boolean {
  return model.includes('claude-3-7') || model.includes('claude-opus-4') || model.includes('claude-sonnet-4-6')
}

/** Route a model id to its provider tag, or null when unknown. */
export function detectProvider(model: string): string | null {
  if (ANTHROPIC_MODELS.some((m) => model.includes(m))) return 'anthropic'
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) return 'openai'
  if (model.startsWith('moonshot')) return 'kimi'
  if (model.includes('deepseek')) return 'deepseek'
  if (model.includes('abab')) return 'minimax'
  return null
}

export function getOpenAIApiKey(settings: NohiSettings, provider: string): string | null {
  if (provider === 'openai') return settings.openaiApiKey ?? null
  if (provider === 'kimi') return settings.kimiApiKey ?? null
  if (provider === 'deepseek') return settings.deepseekApiKey ?? null
  if (provider === 'minimax') return settings.minimaxApiKey ?? null
  return null
}

/**
 * Convert Anthropic-format tool defs to OpenAI function-calling format.
 * Adds `additionalProperties: false` so the schema satisfies OpenAI strict
 * mode if it ever gets flipped on.
 */
export function toOpenAITools(tools: ToolDef[]) {
  return tools.map((t) => {
    const schema = JSON.parse(JSON.stringify(t.inputSchema))
    if (schema.type === 'object' && schema.additionalProperties === undefined) {
      schema.additionalProperties = false
    }
    if (schema.properties && !schema.required) {
      schema.required = []
    }
    return {
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: schema,
        strict: false,
      },
    }
  })
}

/** Convert internal Anthropic-shaped messages to the OpenAI chat format. */
export function toOpenAIMessages(messages: Message[], system: string): unknown[] {
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
      const msg: Record<string, unknown> = { role: 'assistant', content: text || (toolCalls.length > 0 ? null : '') }
      if (toolCalls.length > 0) msg['tool_calls'] = toolCalls
      result.push(msg)
    }
  }
  return result
}
