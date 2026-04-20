// WebSearchTool — Brave Search API primary, DuckDuckGo HTML scrape fallback
// Adapted from Claude Code WebSearchTool

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { getBraveKey } from '../lib/keys'

interface SearchResult {
  title: string
  url: string
  snippet: string
}

// ─── Brave Search (requires API key) ───────────────────────────────────────

async function braveSearch(query: string, count: number, apiKey: string): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Brave API ${res.status}`)
  const data = (await res.json()) as {
    web?: { results?: Array<{ title: string; url: string; description: string }> }
  }
  return (data.web?.results ?? []).map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }))
}

// ─── DuckDuckGo HTML scrape fallback (no API key needed) ───────────────────

async function duckDuckGoSearch(query: string, count: number): Promise<SearchResult[]> {
  // Use DuckDuckGo's lite HTML endpoint (designed for simple clients)
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`)
  const html = await res.text()

  // Parse results from the lite HTML page
  // Result links are in <a class="result-link" href="...">title</a>
  // Snippets are in <td class="result-snippet">...</td>
  const results: SearchResult[] = []

  // Extract result blocks — each result has a link and snippet in table rows
  const linkRegex = /<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const snippetRegex = /<td\s+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi

  const links: { url: string; title: string }[] = []
  let linkMatch: RegExpExecArray | null
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1]
    const title = linkMatch[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").trim()
    // Skip DuckDuckGo internal links
    if (href.startsWith('http') && !href.includes('duckduckgo.com')) {
      links.push({ url: href, title })
    }
  }

  const snippets: string[] = []
  let snippetMatch: RegExpExecArray | null
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const text = snippetMatch[1]
      .replace(/<[^>]+>/g, '')  // strip HTML tags
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) snippets.push(text)
  }

  for (let i = 0; i < Math.min(links.length, count); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] ?? '',
    })
  }

  return results
}

// ─── Tool definition ───────────────────────────────────────────────────────

export const WebSearchTool: ToolDef = {
  name: 'web_search',
  description:
    'Search the web for current information, news, product data, or competitor research. Returns titles, URLs, and snippets for the top results.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
      count: { type: 'number', description: 'Number of results to return (default 5, max 10).' },
    },
    required: ['query'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const query = input.query as string
    const count = Math.min((input.count as number | undefined) ?? 5, 10)

    if (!query.trim()) return { error: 'Search query is empty.' }

    // Try Brave Search first if API key available
    const braveKey = getBraveKey(opts.settings)
    let braveErrorNote = ''
    if (braveKey) {
      try {
        const results = await braveSearch(query, count, braveKey)
        if (results.length > 0) {
          return { output: formatResults(results, query, 'Brave') }
        }
        braveErrorNote = '> Brave returned 0 results — falling back to DuckDuckGo.\n\n'
      } catch (err) {
        const msg = (err as Error).message
        // Visible to the user in the tool output, not just console.
        if (msg.includes('429')) braveErrorNote = '> Brave Search hit rate limit (429) — falling back to DuckDuckGo.\n\n'
        else if (msg.includes('401') || msg.includes('403')) braveErrorNote = '> Brave Search rejected the API key — falling back to DuckDuckGo. Check the key in Settings.\n\n'
        else braveErrorNote = `> Brave Search failed (${msg}) — falling back to DuckDuckGo.\n\n`
      }
    }

    // Fallback: DuckDuckGo HTML scrape
    try {
      const results = await duckDuckGoSearch(query, count)
      if (results.length > 0) {
        return { output: braveErrorNote + formatResults(results, query, braveKey ? 'DuckDuckGo (fallback)' : 'DuckDuckGo') }
      }
      return { output: braveErrorNote + `No results found for "${query}".${!braveKey ? ' Tip: add a Brave Search API key in Settings for better results.' : ''}` }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { error: braveErrorNote + `Search failed: ${e.message ?? 'Unknown error'}` }
    }
  },
}

function formatResults(results: SearchResult[], query: string, source: string): string {
  const header = `Search results for "${query}" via ${source} (${results.length} results):\n`
  const formatted = results
    .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
    .join('\n\n')
  return header + '\n' + formatted
}

// Export shared helpers for deep_research tool
export { braveSearch, duckDuckGoSearch }
export type { SearchResult }
