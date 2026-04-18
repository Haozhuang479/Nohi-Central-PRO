// Attribution tools — agent-facing wrappers around the order ingest service.

import type { ToolDef, ToolResult, ToolCallOpts } from '../../types'
import { clampNumber, runTool } from '../../tools/_utils'
import { ingestShopifyOrders, listOrders, summarize } from './orders'

export const IngestOrdersTool: ToolDef = {
  name: 'ingest_orders',
  description:
    'Pull recent orders from connected source systems (Shopify today) into the local order log at ~/.nohi/orders/. This must be run before analyze_attribution can return fresh numbers. Appends only — safe to re-run; dedup is the catalog server\'s job.',
  inputSchema: {
    type: 'object',
    properties: {
      since_days: {
        type: 'number',
        description: 'Only pull orders from the past N days (1-365, default 30).',
      },
      limit: {
        type: 'number',
        description: 'Max orders to fetch (1-250, default 100).',
      },
    },
  },
  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    return runTool(async () => {
      const sinceDays = clampNumber(input.since_days, { min: 1, max: 365, default: 30 })
      const limit = clampNumber(input.limit, { min: 1, max: 250, default: 100 })
      const merchantId = (opts.settings as Record<string, unknown> | undefined)?.merchantId as string | undefined
      if (!merchantId) return { error: 'merchantId not set (Settings → Agentic Catalog → Merchant ID).' }
      const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
      const result = await ingestShopifyOrders({ merchantId, sinceIso, limit })
      if (result.errors.length > 0) {
        return { error: `Ingest partially failed: ${result.errors.join('; ')}. ${result.ingested} orders saved.` }
      }
      return { output: `Ingested ${result.ingested} orders (since ${sinceIso}).` }
    }, 'ingest_orders')
  },
}

export const AnalyzeAttributionTool: ToolDef = {
  name: 'analyze_attribution',
  description:
    'Compute attribution-by-channel from the local order log. Returns: total orders + GMV, breakdown by channel kind (Nohi-owned / paid external / organic / unattributed), per-channel orders/GMV/AOV. Run ingest_orders first to refresh the log.',
  inputSchema: {
    type: 'object',
    properties: {
      since_days: {
        type: 'number',
        description: 'Aggregation window in days (1-365, default 30).',
      },
      channel_id: {
        type: 'string',
        description: 'Filter to a single channel (e.g. "nohi-skill", "meta-feed").',
      },
    },
  },
  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    return runTool(async () => {
      const sinceDays = clampNumber(input.since_days, { min: 1, max: 365, default: 30 })
      const merchantId = (opts.settings as Record<string, unknown> | undefined)?.merchantId as string | undefined

      const orders = await listOrders({
        since: Date.now() - sinceDays * 24 * 60 * 60 * 1000,
        channelId: input.channel_id as string | undefined as never,
        merchantId,
      })
      if (orders.length === 0) {
        return { output: `No orders in the past ${sinceDays} days. Run ingest_orders first if you haven't recently.` }
      }
      const summary = summarize(orders)
      return { output: formatSummary(summary, sinceDays) }
    }, 'analyze_attribution')
  },
}

function formatSummary(s: ReturnType<typeof summarize>, days: number): string {
  const fmt = (n: number): string => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const cur = s.total.gmv.currency

  const lines: string[] = []
  lines.push(`## Attribution — last ${days} day${days === 1 ? '' : 's'}`)
  lines.push(``)
  lines.push(`**Total:** ${s.total.orders} orders · ${cur} ${fmt(s.total.gmv.amount)}`)
  lines.push(``)
  lines.push(`### By channel kind`)
  lines.push(`| Kind | Orders | GMV | Channels |`)
  lines.push(`|--|--:|--:|--|`)
  for (const kind of ['owned', 'paid', 'organic', 'unattributed'] as const) {
    const k = s.byKind[kind]
    const channels = 'channels' in k ? (k.channels as string[]).join(', ') : '—'
    lines.push(`| ${kind === 'owned' ? 'Nohi-owned' : kind === 'paid' ? 'Paid external' : kind} | ${k.orders} | ${cur} ${fmt(k.gmv)} | ${channels || '—'} |`)
  }
  lines.push(``)
  const channelEntries = Object.entries(s.byChannel).sort((a, b) => b[1].gmv - a[1].gmv)
  if (channelEntries.length > 0) {
    lines.push(`### Per channel`)
    lines.push(`| Channel | Orders | GMV | AOV |`)
    lines.push(`|--|--:|--:|--:|`)
    for (const [id, ch] of channelEntries) {
      lines.push(`| ${id} | ${ch.orders} | ${cur} ${fmt(ch.gmv)} | ${cur} ${fmt(ch.aov)} |`)
    }
  }
  return lines.join('\n')
}
