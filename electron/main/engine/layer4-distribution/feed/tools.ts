// Distribution tools — real implementations for Meta + Google, stubs for the rest.
// Files are written under ~/.nohi/feeds/<channel>/<timestamp>.<ext>.

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { ToolDef, ToolResult, ToolCallOpts } from '../../types'
import { castString, castStringArray, runTool } from '../../tools/_utils'
import { buildFeedRow, selectFeedableProducts } from './builder'
import { buildMetaCsv } from './meta'
import { buildGoogleXml } from './google'
import { listCached } from '../../catalog/client'
import type { ChannelId } from '../../catalog/protocol'

const FEEDS_DIR = join(homedir(), '.nohi', 'feeds')

async function writeFeed(channel: string, contents: string, ext: 'csv' | 'xml'): Promise<string> {
  const dir = join(FEEDS_DIR, channel)
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = join(dir, `${stamp}.${ext}`)
  await writeFile(path, contents, 'utf-8')
  return path
}

async function buildRowsFor(channelId: ChannelId, productIds: string[] | undefined, utmCampaign: string | undefined): Promise<{ rows: ReturnType<typeof buildFeedRow>[]; total: number; selected: number }> {
  const catalog = await listCached()
  const selected = selectFeedableProducts(catalog, productIds)
  const rows = selected.map((p) => buildFeedRow(p, { channelId, utmCampaign }))
  return { rows, total: catalog.length, selected: selected.length }
}

export const DistributeMetaFeedTool: ToolDef = {
  name: 'distribute_meta_feed',
  description:
    'Generate a Meta (Facebook/Instagram) catalog feed from the local Agentic Catalog cache. Applies `meta-feed` channel overrides and stamps UTM source/medium/campaign so order webhooks can attribute revenue back to this channel. Returns a local CSV path the merchant uploads to Meta Commerce Manager.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'OneIDs to include. Omit to include every feedable product in the cache.',
      },
      utm_campaign: { type: 'string', description: 'Campaign tag baked into product URLs.' },
    },
  },
  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    return runTool(async () => {
      const productIds = input.product_ids ? castStringArray(input.product_ids, 'product_ids') : undefined
      const utmCampaign = input.utm_campaign ? castString(input.utm_campaign, 'utm_campaign', { maxLength: 200 }) : undefined
      const { rows, total, selected } = await buildRowsFor('meta-feed', productIds, utmCampaign)
      if (rows.length === 0) return { error: `No feedable products in cache (${total} total, ${selected} after filter). Ingest some Shopify products first.` }
      const csv = buildMetaCsv(rows)
      const path = await writeFeed('meta', csv, 'csv')
      return {
        output: [
          `Meta Catalog feed built.`,
          ``,
          `File: ${path}`,
          `Products: ${rows.length} / ${total} in cache`,
          `Columns: ${csv.split('\n')[0].split(',').length}`,
          `UTM campaign: ${utmCampaign ?? '(none — pass utm_campaign to tag this feed)'}`,
          ``,
          `Upload to Meta Commerce Manager → Catalogs → Data Sources → Add Items. Or schedule automatic re-uploads via Meta's scheduled feed URL feature.`,
        ].join('\n'),
      }
    }, 'distribute_meta_feed')
  },
}

export const DistributeGoogleMerchantTool: ToolDef = {
  name: 'distribute_google_merchant',
  description:
    'Generate a Google Merchant Center XML feed from the local Agentic Catalog cache. Applies `google-merchant` channel overrides and stamps UTM for attribution. Returns a local XML path uploadable to Merchant Center (or hostable as a scheduled feed URL).',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      utm_campaign: { type: 'string' },
      store_title: { type: 'string', description: 'Channel title in the feed metadata (default: your merchant name).' },
      store_link: { type: 'string', description: 'Channel link (default: your storefront URL).' },
    },
  },
  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    return runTool(async () => {
      const productIds = input.product_ids ? castStringArray(input.product_ids, 'product_ids') : undefined
      const utmCampaign = input.utm_campaign ? castString(input.utm_campaign, 'utm_campaign', { maxLength: 200 }) : undefined
      const storeName = (opts.settings as { storeName?: string } | undefined)?.storeName ?? 'Merchant'
      const storeUrl = (opts.settings as { storeUrl?: string } | undefined)?.storeUrl ?? 'https://example.com'
      const feedTitle = input.store_title ? castString(input.store_title, 'store_title', { maxLength: 200 }) : storeName
      const feedLink = input.store_link ? castString(input.store_link, 'store_link', { maxLength: 500 }) : storeUrl

      const { rows, total, selected } = await buildRowsFor('google-merchant', productIds, utmCampaign)
      if (rows.length === 0) return { error: `No feedable products in cache (${total} total, ${selected} after filter). Ingest some Shopify products first.` }
      const xml = buildGoogleXml(rows, {
        title: feedTitle,
        link: feedLink,
        description: `Nohi-generated product feed for ${feedTitle}`,
      })
      const path = await writeFeed('google', xml, 'xml')
      return {
        output: [
          `Google Merchant XML feed built.`,
          ``,
          `File: ${path}`,
          `Products: ${rows.length} / ${total} in cache`,
          `UTM campaign: ${utmCampaign ?? '(none)'}`,
          ``,
          `Upload to Google Merchant Center → Products → Feeds → Add Feed. For automation, host the file at a stable URL and point Merchant Center at it with a fetch schedule.`,
        ].join('\n'),
      }
    }, 'distribute_google_merchant')
  },
}

export const DistributeRedditDpaTool: ToolDef = {
  name: 'distribute_reddit_dpa',
  description:
    'Build a Reddit Dynamic Product Ads catalog feed. Reddit DPA follows the Meta catalog schema so we emit the same CSV format with `reddit-dpa` channel overrides + UTM.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      utm_campaign: { type: 'string' },
    },
  },
  async call(input): Promise<ToolResult> {
    return runTool(async () => {
      const productIds = input.product_ids ? castStringArray(input.product_ids, 'product_ids') : undefined
      const utmCampaign = input.utm_campaign ? castString(input.utm_campaign, 'utm_campaign', { maxLength: 200 }) : undefined
      const { rows, total } = await buildRowsFor('reddit-dpa', productIds, utmCampaign)
      if (rows.length === 0) return { error: `No feedable products in cache (${total} total).` }
      const csv = buildMetaCsv(rows) // Reddit accepts the Meta schema
      const path = await writeFeed('reddit', csv, 'csv')
      return { output: `Reddit DPA feed built.\nFile: ${path}\nProducts: ${rows.length} / ${total}\n\nUpload to Reddit Ads Manager → Shopping catalog.` }
    }, 'distribute_reddit_dpa')
  },
}

export const DistributeAcpTool: ToolDef = {
  name: 'distribute_acp',
  description:
    'Publish products via the Agentic Commerce Protocol (ACP). Organic channel — no Nohi attribution. Awaiting public spec finalization; returns the canonical OneID JSON for now.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      endpoint: { type: 'string' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: 'distribute_acp — awaiting ACP spec finalization. Tool stub registered so the agent can plan around it.' }
  },
}

export const DistributeUcpTool: ToolDef = {
  name: 'distribute_ucp',
  description:
    'Publish products via the Universal Commerce Protocol (UCP). Organic channel, no Nohi attribution. Awaiting public spec finalization.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      endpoint: { type: 'string' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: 'distribute_ucp — awaiting UCP spec finalization. Tool stub registered so the agent can plan around it.' }
  },
}
