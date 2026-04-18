// Order ingestion — pulls orders from source systems (Shopify today; others later),
// normalizes them into the NohiOrder shape, and stores append-only at
// ~/.nohi/orders/<yyyy-mm>.jsonl (one file per month so queries stay fast).
//
// This is the foundation of attribution: once orders are here, we can compute
// "Nohi-owned GMV", "Meta-attributed revenue", etc. by joining on utm_* + channelId.

import { mkdir, readdir, readFile, appendFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { z } from 'zod'
import { log, logError } from '../../lib/logger'
import { getOrders as shopifyGetOrders, getShopifyCreds } from '../../connectors/shopify'
import { ChannelIdSchema } from '../../catalog/protocol'

const ORDERS_DIR = join(homedir(), '.nohi', 'orders')

// ─── Schema ────────────────────────────────────────────────────────────────

const MoneySchema = z.object({ amount: z.number(), currency: z.string() })

export const NohiOrderSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  sourceSystem: z.enum(['shopify', 'manual', 'webhook']),
  sourceOrderId: z.string(),
  customerEmail: z.string().optional(),
  total: MoneySchema,
  products: z.array(z.object({
    oneId: z.string().optional(),      // resolved by downstream matcher; may be absent
    sku: z.string().optional(),
    title: z.string().optional(),
    quantity: z.number().int().min(1),
    lineTotal: MoneySchema,
  })),
  channelId: ChannelIdSchema.optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  referringSite: z.string().optional(),
  landingSite: z.string().optional(),
  createdAt: z.number(),
  ingestedAt: z.number(),
})

export type NohiOrder = z.infer<typeof NohiOrderSchema>

async function ensureDir(): Promise<void> {
  await mkdir(ORDERS_DIR, { recursive: true })
}

function monthFileFor(ts: number): string {
  const d = new Date(ts)
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return join(ORDERS_DIR, `${stamp}.jsonl`)
}

async function appendOrders(orders: NohiOrder[]): Promise<void> {
  if (orders.length === 0) return
  await ensureDir()
  // Group by month so we write one file per group
  const byFile = new Map<string, NohiOrder[]>()
  for (const o of orders) {
    const f = monthFileFor(o.createdAt)
    const list = byFile.get(f) ?? []
    list.push(o)
    byFile.set(f, list)
  }
  for (const [f, list] of byFile) {
    const body = list.map((o) => JSON.stringify(o)).join('\n') + '\n'
    await appendFile(f, body, 'utf-8')
  }
}

// ─── Shopify ingest ────────────────────────────────────────────────────────

/**
 * Shopify order → NohiOrder. Derives channel from note_attributes / UTM on the
 * landing site when present. If Shopify doesn't have UTM info on the order, we
 * leave utm* undefined — downstream attribution can't attribute it.
 */
function shopifyOrderToNohi(order: Record<string, unknown>, merchantId: string): NohiOrder {
  const noteAttrs = (order.note_attributes ?? []) as Array<{ name: string; value: string }>
  const utmFromNote = (key: string): string | undefined =>
    noteAttrs.find((a) => a.name?.toLowerCase() === key)?.value

  const landingSite = (order.landing_site as string | undefined) ?? ''
  const utmFromLanding = (key: string): string | undefined => {
    try {
      const u = new URL(landingSite.startsWith('http') ? landingSite : `https://x${landingSite}`)
      return u.searchParams.get(key) ?? undefined
    } catch { return undefined }
  }

  const utmSource = utmFromNote('utm_source') ?? utmFromLanding('utm_source')
  const utmMedium = utmFromNote('utm_medium') ?? utmFromLanding('utm_medium')
  const utmCampaign = utmFromNote('utm_campaign') ?? utmFromLanding('utm_campaign')

  const channelId = resolveChannel(utmSource, utmMedium)

  const lineItems = (order.line_items ?? []) as Array<Record<string, unknown>>
  const currency = (order.currency as string) ?? 'USD'

  return {
    id: `nohi-ord-${merchantId}-${order.id}`,
    merchantId,
    sourceSystem: 'shopify',
    sourceOrderId: String(order.id),
    customerEmail: order.email as string | undefined,
    total: { amount: Number(order.total_price ?? 0), currency },
    products: lineItems.map((li) => ({
      sku: li.sku as string | undefined,
      title: li.title as string | undefined,
      quantity: Number(li.quantity ?? 1),
      lineTotal: { amount: Number(li.price ?? 0) * Number(li.quantity ?? 1), currency },
    })),
    channelId,
    utmSource, utmMedium, utmCampaign,
    utmTerm: utmFromNote('utm_term') ?? utmFromLanding('utm_term'),
    utmContent: utmFromNote('utm_content') ?? utmFromLanding('utm_content'),
    referringSite: order.referring_site as string | undefined,
    landingSite: landingSite || undefined,
    createdAt: order.created_at ? new Date(order.created_at as string).getTime() : Date.now(),
    ingestedAt: Date.now(),
  }
}

/** Map UTM source/medium to a canonical Nohi ChannelId (or undefined if no match). */
function resolveChannel(source?: string, medium?: string): NohiOrder['channelId'] {
  const s = (source ?? '').toLowerCase()
  const m = (medium ?? '').toLowerCase()
  if (s === 'nohi') {
    if (m.includes('skill')) return 'nohi-skill'
    if (m.includes('chatgpt')) return 'nohi-chatgpt-app'
    if (m.includes('storefront')) return 'nohi-storefront'
    if (m.includes('mcp')) return 'nohi-mcp'
    return 'nohi-storefront' // default owned
  }
  if (s === 'meta' || s === 'facebook' || s === 'instagram') return 'meta-feed'
  if (s === 'google') return 'google-merchant'
  if (s === 'reddit') return 'reddit-dpa'
  if (s === 'tiktok') return 'tiktok-shop'
  return undefined
}

/**
 * Pull recent Shopify orders and append them as NohiOrder records.
 * Dedup is the responsibility of the caller (check existing sourceOrderId); this
 * function just writes what it fetched.
 */
export async function ingestShopifyOrders(opts: { merchantId: string; sinceIso?: string; limit?: number } = { merchantId: 'unknown' }): Promise<{ ingested: number; errors: string[] }> {
  const creds = await getShopifyCreds()
  if (!creds) return { ingested: 0, errors: ['Shopify not connected'] }
  try {
    const { orders } = await shopifyGetOrders({
      limit: opts.limit ?? 100,
      status: 'any',
      createdAtMin: opts.sinceIso,
    })
    const normalized = orders.map((o) => shopifyOrderToNohi(o, opts.merchantId))
    await appendOrders(normalized)
    log('info', `[orders] ingested ${normalized.length} Shopify orders for ${opts.merchantId}`)
    return { ingested: normalized.length, errors: [] }
  } catch (err) {
    logError(err, '[orders] Shopify ingest failed')
    return { ingested: 0, errors: [err instanceof Error ? err.message : String(err)] }
  }
}

// ─── Query ─────────────────────────────────────────────────────────────────

export interface OrderFilter {
  since?: number        // unix ms
  until?: number
  channelId?: NohiOrder['channelId']
  merchantId?: string
}

export async function listOrders(filter: OrderFilter = {}): Promise<NohiOrder[]> {
  await ensureDir()
  let files: string[]
  try {
    files = (await readdir(ORDERS_DIR)).filter((f) => f.endsWith('.jsonl')).sort()
  } catch {
    return []
  }

  const out: NohiOrder[] = []
  for (const f of files) {
    const raw = await readFile(join(ORDERS_DIR, f), 'utf-8').catch(() => '')
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      try {
        const parsed = NohiOrderSchema.safeParse(JSON.parse(line))
        if (!parsed.success) continue
        const o = parsed.data
        if (filter.since && o.createdAt < filter.since) continue
        if (filter.until && o.createdAt > filter.until) continue
        if (filter.channelId && o.channelId !== filter.channelId) continue
        if (filter.merchantId && o.merchantId !== filter.merchantId) continue
        out.push(o)
      } catch { /* skip malformed lines */ }
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

// ─── Attribution aggregation ──────────────────────────────────────────────

export interface AttributionSummary {
  total: { orders: number; gmv: { amount: number; currency: string } }
  byKind: {
    owned: { orders: number; gmv: number; channels: string[] }
    paid: { orders: number; gmv: number; channels: string[] }
    organic: { orders: number; gmv: number; channels: string[] }
    unattributed: { orders: number; gmv: number }
  }
  byChannel: Record<string, { orders: number; gmv: number; aov: number }>
}

const CHANNEL_KIND: Record<string, 'owned' | 'paid' | 'organic'> = {
  'nohi-skill': 'owned',
  'nohi-chatgpt-app': 'owned',
  'nohi-storefront': 'owned',
  'nohi-mcp': 'owned',
  'meta-feed': 'paid',
  'google-merchant': 'paid',
  'reddit-dpa': 'paid',
  'tiktok-shop': 'paid',
  'acp': 'organic',
  'ucp': 'organic',
}

export function summarize(orders: NohiOrder[]): AttributionSummary {
  const currency = orders[0]?.total.currency ?? 'USD'
  const summary: AttributionSummary = {
    total: { orders: orders.length, gmv: { amount: 0, currency } },
    byKind: {
      owned: { orders: 0, gmv: 0, channels: [] },
      paid: { orders: 0, gmv: 0, channels: [] },
      organic: { orders: 0, gmv: 0, channels: [] },
      unattributed: { orders: 0, gmv: 0 },
    },
    byChannel: {},
  }
  const ownedSet = new Set<string>()
  const paidSet = new Set<string>()
  const organicSet = new Set<string>()

  for (const o of orders) {
    const amount = o.total.amount
    summary.total.gmv.amount += amount
    const kind = o.channelId ? CHANNEL_KIND[o.channelId] : undefined
    if (!kind) {
      summary.byKind.unattributed.orders++
      summary.byKind.unattributed.gmv += amount
      continue
    }
    summary.byKind[kind].orders++
    summary.byKind[kind].gmv += amount
    if (kind === 'owned') ownedSet.add(o.channelId!)
    if (kind === 'paid') paidSet.add(o.channelId!)
    if (kind === 'organic') organicSet.add(o.channelId!)
    const c = o.channelId!
    const ch = summary.byChannel[c] ?? { orders: 0, gmv: 0, aov: 0 }
    ch.orders++
    ch.gmv += amount
    ch.aov = ch.gmv / ch.orders
    summary.byChannel[c] = ch
  }
  summary.byKind.owned.channels = [...ownedSet]
  summary.byKind.paid.channels = [...paidSet]
  summary.byKind.organic.channels = [...organicSet]
  return summary
}
