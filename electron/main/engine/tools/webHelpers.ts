// Shared web search and fetch helpers used by webSearch, webFetch, and deepResearch tools

import type { ToolCallOpts } from '../types'
import { getBraveKey } from '../lib/keys'

export interface SearchResult {
  title: string
  url: string
  description: string
}

// Brave Search API
export async function braveSearch(query: string, count: number, apiKey: string): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Brave Search ${res.status}`)
  const data = (await res.json()) as {
    web?: { results?: Array<{ title: string; url: string; description: string }> }
  }
  return (data.web?.results ?? []).map(r => ({ title: r.title, url: r.url, description: r.description }))
}

// DuckDuckGo Instant Answer fallback
export async function duckDuckGoSearch(query: string, count: number): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`DDG ${res.status}`)
  const data = (await res.json()) as {
    AbstractText?: string
    AbstractURL?: string
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
  }
  const results: SearchResult[] = []
  if (data.AbstractText && data.AbstractURL) {
    results.push({ title: 'Summary', url: data.AbstractURL, description: data.AbstractText })
  }
  for (const t of (data.RelatedTopics ?? []).slice(0, count)) {
    if (t.Text && t.FirstURL) {
      results.push({ title: t.Text.slice(0, 80), url: t.FirstURL, description: t.Text })
    }
  }
  return results
}

// Unified search: tries Brave first, falls back to DuckDuckGo
export async function webSearch(query: string, count: number, opts: ToolCallOpts): Promise<SearchResult[]> {
  const braveKey = getBraveKey(opts.settings)
  if (braveKey) {
    try {
      return await braveSearch(query, count, braveKey)
    } catch { /* fall through */ }
  }
  return await duckDuckGoSearch(query, count)
}

// Lightweight HTML → readable text (was turndown — removed in v2.2.1).
function stripHtml(html: string): string {
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  out = out.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, l, inner) => '\n\n' + '#'.repeat(Number(l)) + ' ' + inner.replace(/<[^>]+>/g, '').trim() + '\n\n')
  out = out.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
    const t = inner.replace(/<[^>]+>/g, '').trim()
    return t ? `[${t}](${href})` : href
  })
  out = out.replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li\b[^>]*>/gi, '- ')
  out = out.replace(/<[^>]+>/g, '')
  out = out
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
  return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

// Fetch a URL and convert to clean text
export async function fetchAndConvert(url: string, maxLength = 50_000): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NohiCentralPRO/1.0)',
      Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const contentType = response.headers.get('content-type') ?? ''
  let text: string
  if (contentType.includes('text/html')) {
    const html = await response.text()
    text = stripHtml(html)
  } else {
    text = await response.text()
  }
  return text.length > maxLength ? text.slice(0, maxLength) + '\n...(truncated)' : text
}
