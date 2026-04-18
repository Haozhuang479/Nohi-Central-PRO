// Firecrawl Tools — web scraping, crawling, and search via Firecrawl API
// API docs: https://docs.firecrawl.dev
// Supports both cloud (api.firecrawl.dev) and self-hosted instances

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { createBearerClient, createHttpClient, HttpError } from '../lib/http'

const DEFAULT_API_URL = 'https://api.firecrawl.dev'

function getBaseUrl(settings?: ToolCallOpts['settings']): string {
  return (settings as Record<string, unknown> | undefined)?.firecrawlApiUrl as string
    ?? DEFAULT_API_URL
}

function getApiKey(settings?: ToolCallOpts['settings']): string | undefined {
  return (settings as Record<string, unknown> | undefined)?.firecrawlApiKey as string | undefined
}

function client(opts: ToolCallOpts) {
  const apiKey = getApiKey(opts.settings)
  const baseUrl = getBaseUrl(opts.settings)
  return apiKey
    ? createBearerClient(apiKey, { baseUrl, defaultTimeoutMs: 60_000 })
    : createHttpClient({ baseUrl, defaultTimeoutMs: 60_000 })
}

// Backward-compat wrappers — same shape as before, now delegating to the shared client.
// Existing tool bodies below still call firecrawlPost/firecrawlGet without changes.
async function firecrawlPost(
  path: string,
  body: Record<string, unknown>,
  opts: ToolCallOpts,
): Promise<{ ok: boolean; status: number; data: unknown; errorText: string }> {
  try {
    const data = await client(opts).post<unknown>(path, body)
    return { ok: true, status: 200, data, errorText: '' }
  } catch (err) {
    if (err instanceof HttpError) {
      return { ok: false, status: err.status, data: null, errorText: err.bodyPreview }
    }
    return { ok: false, status: 0, data: null, errorText: err instanceof Error ? err.message : String(err) }
  }
}

async function firecrawlGet(
  path: string,
  opts: ToolCallOpts,
): Promise<{ ok: boolean; status: number; data: unknown; errorText: string }> {
  try {
    const data = await client(opts).get<unknown>(path, { timeoutMs: 30_000 })
    return { ok: true, status: 200, data, errorText: '' }
  } catch (err) {
    if (err instanceof HttpError) {
      return { ok: false, status: err.status, data: null, errorText: err.bodyPreview }
    }
    return { ok: false, status: 0, data: null, errorText: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Firecrawl Scrape Tool ────────────────────────────────────────────────

export const FirecrawlScrapeTool: ToolDef = {
  name: 'firecrawl_scrape',
  description:
    'Scrape a webpage and convert it to clean markdown using Firecrawl. Much better than webFetch for complex pages — handles JavaScript, removes navigation/ads, extracts main content. Use for reading articles, documentation, product pages, or any webpage where clean text extraction matters. Requires a Firecrawl API key in settings.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to scrape.',
      },
      only_main_content: {
        type: 'boolean',
        description: 'Extract only the main content, removing navigation, headers, footers, and ads. Default: true.',
      },
      include_links: {
        type: 'boolean',
        description: 'Include a list of links found on the page. Default: false.',
      },
      mobile: {
        type: 'boolean',
        description: 'Simulate a mobile browser viewport. Default: false.',
      },
    },
    required: ['url'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const url = input.url as string
    const onlyMainContent = (input.only_main_content as boolean | undefined) ?? true
    const includeLinks = (input.include_links as boolean | undefined) ?? false
    const mobile = (input.mobile as boolean | undefined) ?? false

    if (!url.trim()) return { error: 'URL cannot be empty.' }

    const apiKey = getApiKey(opts.settings)
    if (!apiKey) {
      return { error: 'Firecrawl API key not set. Go to Settings → Web Search to add it.' }
    }

    opts.onProgress?.(`Scraping ${url}...`)

    const formats = ['markdown']
    if (includeLinks) formats.push('links')

    const result = await firecrawlPost('/v2/scrape', {
      url,
      scrapeOptions: {
        formats,
        onlyMainContent,
        mobile,
        blockAds: true,
      },
    }, opts)

    if (!result.ok) {
      return { error: `Firecrawl scrape failed (${result.status}): ${result.errorText.slice(0, 300)}` }
    }

    const data = result.data as Record<string, unknown>
    if (!data.success) {
      return { error: `Firecrawl error: ${data.error ?? 'Unknown error'}` }
    }

    const doc = data.data as Record<string, unknown> | undefined
    if (!doc) return { error: 'No document returned from Firecrawl.' }

    const title = (doc.metadata as Record<string, unknown> | undefined)?.title as string | undefined
    const markdown = doc.markdown as string | undefined
    const links = doc.links as string[] | undefined

    let output = ''
    if (title) output += `# ${title}\n\nSource: ${url}\n\n`
    if (markdown) output += markdown
    if (includeLinks && links?.length) {
      output += `\n\n## Links Found\n${links.slice(0, 50).map(l => `- ${l}`).join('\n')}`
    }

    if (!output.trim()) return { error: 'Firecrawl returned empty content.' }

    return { output }
  },
}

// ─── Firecrawl Search Tool ─────────────────────────────────────────────────

export const FirecrawlSearchTool: ToolDef = {
  name: 'firecrawl_search',
  description:
    'Search the web using Firecrawl and get full page content for each result — not just snippets. Returns detailed markdown content from the top search results. More powerful than web_search when you need to read the actual content of results. Requires a Firecrawl API key.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query.',
      },
      limit: {
        type: 'number',
        description: 'Number of results to return (1-10). Default: 5.',
      },
      scrape_content: {
        type: 'boolean',
        description: 'Fetch full markdown content for each result. Default: false (returns summaries/snippets only).',
      },
      time_range: {
        type: 'string',
        description: 'Time range for results: "d" (past day), "w" (past week), "m" (past month), "y" (past year). Leave empty for all time.',
      },
    },
    required: ['query'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const query = input.query as string
    const limit = Math.min(Math.max((input.limit as number | undefined) ?? 5, 1), 10)
    const scrapeContent = (input.scrape_content as boolean | undefined) ?? false
    const timeRange = input.time_range as string | undefined

    if (!query.trim()) return { error: 'Search query cannot be empty.' }

    const apiKey = getApiKey(opts.settings)
    if (!apiKey) {
      return { error: 'Firecrawl API key not set. Go to Settings → Web Search to add it.' }
    }

    opts.onProgress?.(`Searching: "${query}"...`)

    const body: Record<string, unknown> = {
      query,
      limit,
      sources: ['web'],
    }
    if (timeRange) body.tbs = timeRange
    if (scrapeContent) {
      body.scrapeOptions = { formats: ['markdown'], onlyMainContent: true, blockAds: true }
    }

    const result = await firecrawlPost('/v2/search', body, opts)

    if (!result.ok) {
      return { error: `Firecrawl search failed (${result.status}): ${result.errorText.slice(0, 300)}` }
    }

    const data = result.data as Record<string, unknown>
    if (!data.success) {
      return { error: `Firecrawl search error: ${data.error ?? 'Unknown error'}` }
    }

    const searchData = data.data as Record<string, unknown> | undefined
    const webResults = (searchData?.web ?? []) as Array<Record<string, unknown>>

    if (!webResults.length) return { output: `No results found for: "${query}"` }

    let output = `## Search Results for: "${query}"\n\n`

    for (let i = 0; i < webResults.length; i++) {
      const r = webResults[i]
      const title = r.title as string | undefined
      const url = r.url as string | undefined
      const description = r.description as string | undefined
      const markdown = r.markdown as string | undefined

      output += `### ${i + 1}. ${title ?? 'Untitled'}\n`
      if (url) output += `URL: ${url}\n`
      if (description) output += `${description}\n`
      if (scrapeContent && markdown) {
        output += `\n${markdown.slice(0, 2000)}\n`
        if (markdown.length > 2000) output += `\n*[Content truncated — ${markdown.length - 2000} more characters]*\n`
      }
      output += '\n'
    }

    return { output }
  },
}

// ─── Firecrawl Crawl Tool ──────────────────────────────────────────────────

export const FirecrawlCrawlTool: ToolDef = {
  name: 'firecrawl_crawl',
  description:
    'Crawl an entire website and extract content from multiple pages. Starts from a URL and follows links to discover and scrape pages. Use for comprehensive site research, documentation extraction, or competitive analysis. Warning: can be slow and consume many API credits. Requires a Firecrawl API key.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The starting URL to crawl.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of pages to crawl (1-50). Default: 10.',
      },
      max_depth: {
        type: 'number',
        description: 'Maximum link depth to follow (1-5). Default: 2.',
      },
      include_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only crawl URLs matching these path patterns (e.g., ["/docs", "/blog"]).',
      },
      exclude_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Skip URLs matching these path patterns.',
      },
    },
    required: ['url'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const url = input.url as string
    const limit = Math.min(Math.max((input.limit as number | undefined) ?? 10, 1), 50)
    const maxDepth = Math.min(Math.max((input.max_depth as number | undefined) ?? 2, 1), 5)
    const includePaths = input.include_paths as string[] | undefined
    const excludePaths = input.exclude_paths as string[] | undefined

    if (!url.trim()) return { error: 'URL cannot be empty.' }

    const apiKey = getApiKey(opts.settings)
    if (!apiKey) {
      return { error: 'Firecrawl API key not set. Go to Settings → Web Search to add it.' }
    }

    opts.onProgress?.(`Starting crawl of ${url}...`)

    const crawlBody: Record<string, unknown> = {
      url,
      limit,
      maxDiscoveryDepth: maxDepth,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true, blockAds: true },
    }
    if (includePaths?.length) crawlBody.includePaths = includePaths
    if (excludePaths?.length) crawlBody.excludePaths = excludePaths

    // Start the crawl job
    const startResult = await firecrawlPost('/v2/crawl', crawlBody, opts)

    if (!startResult.ok) {
      return { error: `Failed to start crawl (${startResult.status}): ${startResult.errorText.slice(0, 300)}` }
    }

    const startData = startResult.data as Record<string, unknown>
    if (!startData.success) {
      return { error: `Firecrawl crawl error: ${startData.error ?? 'Unknown error'}` }
    }

    const jobId = startData.id as string | undefined
    if (!jobId) return { error: 'No crawl job ID returned.' }

    opts.onProgress?.(`Crawl started (job: ${jobId}). Waiting for results...`)

    // Poll for completion (max 90 seconds)
    const maxPolls = 18
    const pollInterval = 5000

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      const pollResult = await firecrawlGet(`/v2/crawl/${jobId}`, opts)
      if (!pollResult.ok) continue

      const job = pollResult.data as Record<string, unknown>
      const status = job.status as string
      const completed = job.completed as number ?? 0
      const total = job.total as number ?? 0

      opts.onProgress?.(`Crawling... ${completed}/${total} pages (${status})`)

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        if (status !== 'completed') {
          return { error: `Crawl ${status}.` }
        }

        const docs = (job.data as Array<Record<string, unknown>>) ?? []

        if (!docs.length) return { output: 'Crawl completed but no pages were scraped.' }

        let output = `## Crawl Results for: ${url}\n\nCrawled ${docs.length} pages\n\n`

        for (let d = 0; d < docs.length; d++) {
          const doc = docs[d]
          const pageUrl = (doc.metadata as Record<string, unknown> | undefined)?.url as string ?? 'Unknown URL'
          const title = (doc.metadata as Record<string, unknown> | undefined)?.title as string ?? 'Untitled'
          const markdown = doc.markdown as string | undefined

          output += `### Page ${d + 1}: ${title}\n`
          output += `URL: ${pageUrl}\n\n`
          if (markdown) {
            const preview = markdown.slice(0, 1500)
            output += preview
            if (markdown.length > 1500) output += `\n*[+${markdown.length - 1500} more characters]*`
          }
          output += '\n\n---\n\n'

          // Limit total output size
          if (output.length > 20000) {
            output += `\n*[Truncated: ${docs.length - d - 1} more pages not shown]*`
            break
          }
        }

        return { output }
      }
    }

    return { error: 'Crawl timed out after 90 seconds. The job may still be running in Firecrawl.' }
  },
}
