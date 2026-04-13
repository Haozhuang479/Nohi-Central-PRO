// WebSearchTool — uses Brave Search API (free tier available)
// Adapted from Claude Code WebSearchTool

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

export const WebSearchTool: ToolDef = {
  name: 'web_search',
  description:
    'Search the web for current information, news, product data, or competitor research.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
      count: { type: 'number', description: 'Number of results to return (default 5, max 10).' },
    },
    required: ['query'],
  },

  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    const query = input.query as string
    const count = Math.min((input.count as number | undefined) ?? 5, 10)

    // Try Brave Search API if key is configured
    const braveKey = process.env.BRAVE_SEARCH_API_KEY
    if (braveKey) {
      try {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': braveKey,
          },
          signal: AbortSignal.timeout(15_000),
        })

        if (res.ok) {
          const data = (await res.json()) as {
            web?: { results?: Array<{ title: string; url: string; description: string }> }
          }
          const results = data.web?.results ?? []
          if (results.length === 0) return { output: 'No results found.' }

          const formatted = results
            .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
            .join('\n\n')
          return { output: formatted }
        }
      } catch (_) {
        // Fall through to DuckDuckGo
      }
    }

    // Fallback: DuckDuckGo Instant Answer API (no key required)
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) return { error: `Search failed: HTTP ${res.status}` }

      const data = (await res.json()) as {
        AbstractText?: string
        AbstractURL?: string
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
      }

      const parts: string[] = []
      if (data.AbstractText) {
        parts.push(`**Summary:** ${data.AbstractText}\nSource: ${data.AbstractURL}`)
      }
      const related = (data.RelatedTopics ?? []).slice(0, count)
      for (const t of related) {
        if (t.Text && t.FirstURL) {
          parts.push(`• ${t.Text}\n  ${t.FirstURL}`)
        }
      }

      if (parts.length === 0) {
        return {
          output: `No instant results. Add a BRAVE_SEARCH_API_KEY to settings for full web search.\nQuery: ${query}`,
        }
      }
      return { output: parts.join('\n\n') }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { error: e.message ?? 'Search failed' }
    }
  },
}
