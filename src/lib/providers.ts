// Provider / model metadata + label helpers.
//
// Extracted from src/pages/chat/page.tsx as part of the Phase C split so
// multiple chat-related views can reuse these constants without copy-paste.
// The v1.6 regression (helpers lost during a chat-page split) is guarded
// by regression.test.ts — do not shadow these names back inside page.tsx.

export const PROVIDER_LABELS = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  kimi: 'Kimi',
  minimax: 'Minimax',
  deepseek: 'DeepSeek',
} as const

export const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-5', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini', 'o4-mini'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  minimax: ['abab6.5s-chat'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
}

/** Model-family context window size in tokens. Used by the token meter. */
export function getContextWindow(model: string): number {
  if (model.includes('claude')) return 200_000
  if (model.includes('gpt-4o') || model.includes('gpt-4.1') || model.includes('gpt-5')) return 128_000
  if (model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) return 128_000
  if (model.includes('moonshot-v1-128k')) return 128_000
  if (model.includes('moonshot-v1-32k')) return 32_000
  if (model.includes('moonshot')) return 8_000
  if (model.includes('deepseek')) return 64_000
  return 32_000
}

/** Pretty-print a token count: 128000 -> "128K". */
export function formatCtxLabel(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}

/** Shorten an absolute filesystem path for display in the top bar. */
export function shortenPath(p: string): string {
  if (!p) return ''
  const home = '/Users/'
  if (p.startsWith(home)) {
    const rest = p.slice(home.indexOf('/Users/') + 7)
    const slash = rest.indexOf('/')
    return '~/' + (slash === -1 ? rest : rest.slice(slash + 1))
  }
  const parts = p.split('/')
  if (parts.length > 3) return '…/' + parts.slice(-2).join('/')
  return p
}
