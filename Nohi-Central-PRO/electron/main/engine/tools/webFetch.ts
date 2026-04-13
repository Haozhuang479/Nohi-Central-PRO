// WebFetchTool — adapted from Claude Code WebFetchTool
// Fetches a URL and converts HTML to clean markdown

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const MAX_LENGTH = 50_000 // ~50KB of markdown

async function htmlToText(html: string): Promise<string> {
  // Lazy import to avoid bundling issues
  const TurndownService = (await import('turndown')).default
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  td.remove(['script', 'style', 'nav', 'footer', 'iframe', 'noscript'])
  return td.turndown(html)
}

export const WebFetchTool: ToolDef = {
  name: 'web_fetch',
  description:
    'Fetch a URL and return its content as clean text/markdown. Use for reading documentation, articles, and web pages.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to fetch.' },
      prompt: {
        type: 'string',
        description:
          'Optional: specific question to answer from the page content. If provided, only the relevant portion is returned.',
      },
    },
    required: ['url'],
  },

  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    const url = input.url as string

    // Validate URL scheme
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { error: 'Only http/https URLs are supported.' }
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NohiCentralPRO/1.0)',
          Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
        },
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        return { error: `HTTP ${response.status} ${response.statusText} for ${url}` }
      }

      const contentType = response.headers.get('content-type') ?? ''
      let text: string

      if (contentType.includes('text/html')) {
        const html = await response.text()
        text = await htmlToText(html)
      } else {
        text = await response.text()
      }

      if (text.length > MAX_LENGTH) {
        text = text.slice(0, MAX_LENGTH) + `\n\n...(truncated at ${MAX_LENGTH} chars)`
      }

      return { output: text }
    } catch (err: unknown) {
      const e = err as { message?: string; name?: string }
      if (e.name === 'TimeoutError') return { error: 'Request timed out after 30s' }
      return { error: e.message ?? 'Fetch failed' }
    }
  },
}
