// DeepResearchTool — multi-hop web research with synthesis and citations

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { webSearch, fetchAndConvert } from './webHelpers'

export const DeepResearchTool: ToolDef = {
  name: 'deep_research',
  description:
    'Perform in-depth multi-step research on a topic. Searches the web, reads top results, synthesizes findings with source citations, and optionally runs follow-up searches for deeper understanding. Use for complex questions needing multiple sources.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The research question or topic.' },
      depth: { type: 'number', description: 'Research cycles: 1 (quick), 2 (standard), 3 (thorough). Default 2.' },
    },
    required: ['query'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const query = input.query as string
    const depth = Math.min(Math.max((input.depth as number | undefined) ?? 2, 1), 3)

    const allSources: Array<{ title: string; url: string; content: string }> = []
    const findings: string[] = []
    let currentQuery = query

    opts.onProgress?.(`Researching: "${query}" (depth: ${depth})...`)

    for (let cycle = 0; cycle < depth; cycle++) {
      opts.onProgress?.(`\nSearch cycle ${cycle + 1}/${depth}: "${currentQuery}"`)

      // Search
      let results
      try {
        results = await webSearch(currentQuery, 5, opts)
      } catch (err: unknown) {
        findings.push(`[Cycle ${cycle + 1}] Search failed: ${(err as { message?: string }).message}`)
        break
      }

      if (results.length === 0) {
        findings.push(`[Cycle ${cycle + 1}] No results found for "${currentQuery}"`)
        break
      }

      // Fetch top 3 results
      const urlsToFetch = results.slice(0, 3)
      for (const r of urlsToFetch) {
        try {
          const content = await fetchAndConvert(r.url, 15_000) // 15KB per page
          allSources.push({ title: r.title, url: r.url, content })
          opts.onProgress?.(` Fetched: ${r.title.slice(0, 60)}`)
        } catch {
          // Skip failed fetches
        }
      }

      // Add search result summaries even for unfetched results
      for (const r of results.slice(3)) {
        allSources.push({ title: r.title, url: r.url, content: r.description })
      }

      // Build a cycle summary from fetched content
      const cycleSources = allSources.slice(-urlsToFetch.length)
      if (cycleSources.length > 0) {
        const summaryParts = cycleSources.map((s, i) => {
          const sourceIdx = allSources.indexOf(s) + 1
          const excerpt = s.content.slice(0, 500).replace(/\n+/g, ' ').trim()
          return `[${sourceIdx}] ${s.title}: ${excerpt}`
        })
        findings.push(`### Cycle ${cycle + 1} — "${currentQuery}"\n${summaryParts.join('\n\n')}`)
      }

      // Generate follow-up query for next cycle (simple heuristic: append "details" or "latest")
      if (cycle < depth - 1) {
        const refinements = ['latest developments', 'detailed analysis', 'expert opinions']
        currentQuery = `${query} ${refinements[cycle] ?? ''}`
      }
    }

    // Format final output
    const sourceList = allSources.map((s, i) =>
      `[${i + 1}] ${s.title}\n    ${s.url}`
    ).join('\n')

    const output = `## Research: ${query}\n\n` +
      findings.join('\n\n') +
      `\n\n---\n### Sources (${allSources.length} total)\n${sourceList}`

    return { output }
  },
}
