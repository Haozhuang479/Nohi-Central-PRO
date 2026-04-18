// WebFetchTool — adapted from Claude Code WebFetchTool
// Fetches a URL and converts HTML to clean markdown

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const MAX_LENGTH = 50_000 // ~50KB of markdown

/**
 * Lightweight HTML → text converter. Replaced a 200 KB turndown dependency whose
 * polish we weren't really using (we only want readable text for the agent, not
 * Markdown fidelity). Handles the cases that matter: strip noise tags, collapse
 * whitespace, preserve paragraph + link structure.
 */
function htmlToText(html: string): string {
  // Remove noise elements entirely (including their content)
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Headings → markdown-ish
  out = out.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, inner) => {
    return '\n\n' + '#'.repeat(Number(level)) + ' ' + stripTags(inner).trim() + '\n\n'
  })

  // Links → [text](url)
  out = out.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
    const text = stripTags(inner).trim()
    return text ? `[${text}](${href})` : href
  })

  // Paragraphs and <br> → line breaks
  out = out.replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n\n')
  out = out.replace(/<br\s*\/?>/gi, '\n')
  out = out.replace(/<li\b[^>]*>/gi, '- ')

  // Strip remaining tags
  out = stripTags(out)

  // Decode common entities
  out = out
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")

  // Collapse whitespace runs but preserve paragraph breaks
  out = out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return out
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
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
        text = htmlToText(html)
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
