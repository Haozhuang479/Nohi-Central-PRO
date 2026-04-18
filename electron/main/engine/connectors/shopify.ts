// Shopify connector — uses Admin API access tokens from a Shopify Custom App.
// Why not full OAuth: registering as a Shopify Partner app is heavyweight and
// locks Nohi to a public scope. Since PRO is a local-first per-merchant tool,
// the Custom App flow (user creates an app in their Shopify admin → copies the
// Admin API access token → pastes into Nohi) is simpler, safer, and standard.

import { loadCredentials, saveCredentials, deleteCredentials, markUsed, markError } from './store'
import { z } from 'zod'
import type { PartialProduct } from '../catalog/protocol'

const SHOPIFY_API_VERSION = '2025-01'

export const ShopifyCredentialsSchema = z.object({
  shop: z.string().regex(/^[a-z0-9-]+(\.myshopify\.com)?$/i, 'Shop must be "mystore" or "mystore.myshopify.com"'),
  accessToken: z.string().regex(/^shp(at|ua|ca)_[a-f0-9]{32}$/, 'Must be a Shopify Admin API access token (shpat_...)'),
  _account: z.string().optional(),
  _connectedAt: z.number().optional(),
  _lastUsedAt: z.number().optional(),
  _lastError: z.string().optional(),
})

export type ShopifyCredentials = z.infer<typeof ShopifyCredentialsSchema>

function normalizeShop(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (trimmed.endsWith('.myshopify.com')) return trimmed
  return `${trimmed}.myshopify.com`
}

export async function connectShopify(shop: string, accessToken: string): Promise<{ ok: true; account: string } | { ok: false; error: string }> {
  const normalized = normalizeShop(shop)
  // Validate format
  const parsed = ShopifyCredentialsSchema.safeParse({ shop: normalized, accessToken })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }
  }
  // Ping the Shopify Admin API to verify the token works
  try {
    const resp = await fetch(`https://${normalized}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return { ok: false, error: `Shopify API returned ${resp.status}: ${text.slice(0, 200)}` }
    }
    const data = await resp.json() as { shop?: { name?: string; email?: string; domain?: string } }
    const account = data.shop?.name || data.shop?.domain || normalized
    await saveCredentials<ShopifyCredentials>('shopify', {
      shop: normalized,
      accessToken,
      _account: account,
      _connectedAt: Date.now(),
    })
    return { ok: true, account }
  } catch (err) {
    const e = err as { name?: string; message?: string }
    return { ok: false, error: e.name === 'TimeoutError' ? 'Shopify API timed out' : (e.message ?? 'Unknown error') }
  }
}

export async function disconnectShopify(): Promise<void> {
  await deleteCredentials('shopify')
}

export async function getShopifyCreds(): Promise<ShopifyCredentials | null> {
  const raw = await loadCredentials<ShopifyCredentials>('shopify')
  if (!raw) return null
  const parsed = ShopifyCredentialsSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

async function shopifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const creds = await getShopifyCreds()
  if (!creds) throw new Error('Shopify not connected. Run the "Connect Shopify" flow in Settings.')
  const url = `https://${creds.shop}/admin/api/${SHOPIFY_API_VERSION}${path}`
  const resp = await fetch(url, {
    ...init,
    headers: {
      'X-Shopify-Access-Token': creds.accessToken,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!resp.ok) {
    const text = await resp.text()
    const msg = `Shopify ${resp.status}: ${text.slice(0, 300)}`
    await markError('shopify', msg)
    throw new Error(msg)
  }
  await markUsed('shopify')
  return (await resp.json()) as T
}

// ─── Typed wrappers ────────────────────────────────────────────────────────

export interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  handle?: string
  tags?: string
  status?: string
  image?: { src: string; alt?: string | null }
  images?: Array<{ src: string; alt?: string | null; width?: number; height?: number }>
  variants?: Array<{
    id: number
    sku?: string
    title?: string
    price?: string
    compare_at_price?: string | null
    inventory_quantity?: number
    option1?: string | null
    option2?: string | null
    option3?: string | null
  }>
  options?: Array<{ name: string; values: string[] }>
  created_at?: string
  updated_at?: string
}

export async function listProducts(opts: { limit?: number; pageInfo?: string; status?: 'active' | 'archived' | 'draft' } = {}): Promise<{ products: ShopifyProduct[]; nextPageInfo?: string }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 250)
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (opts.status) params.set('status', opts.status)
  if (opts.pageInfo) params.set('page_info', opts.pageInfo)

  const creds = await getShopifyCreds()
  if (!creds) throw new Error('Shopify not connected.')
  const url = `https://${creds.shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params.toString()}`
  const resp = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': creds.accessToken },
    signal: AbortSignal.timeout(30_000),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Shopify ${resp.status}: ${text.slice(0, 300)}`)
  }
  await markUsed('shopify')
  const data = (await resp.json()) as { products: ShopifyProduct[] }
  // Parse Link header for pagination
  const link = resp.headers.get('link') ?? resp.headers.get('Link') ?? ''
  const nextMatch = link.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/)
  const nextPageInfo = nextMatch ? decodeURIComponent(nextMatch[1]) : undefined
  return { products: data.products, nextPageInfo }
}

export async function getProduct(id: number | string): Promise<ShopifyProduct> {
  const data = await shopifyFetch<{ product: ShopifyProduct }>(`/products/${id}.json`)
  return data.product
}

export async function updateProduct(id: number | string, patch: Partial<Pick<ShopifyProduct, 'title' | 'body_html' | 'tags' | 'product_type' | 'vendor' | 'status'>>): Promise<ShopifyProduct> {
  const data = await shopifyFetch<{ product: ShopifyProduct }>(`/products/${id}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: { id, ...patch } }),
  })
  return data.product
}

export async function getOrders(opts: { limit?: number; status?: 'any' | 'open' | 'closed' | 'cancelled'; createdAtMin?: string } = {}): Promise<{ orders: Array<Record<string, unknown>> }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 250)
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('status', opts.status ?? 'any')
  if (opts.createdAtMin) params.set('created_at_min', opts.createdAtMin)
  return shopifyFetch<{ orders: Array<Record<string, unknown>> }>(`/orders.json?${params.toString()}`)
}

export async function getInventoryLevels(locationIds?: number[]): Promise<{ inventory_levels: Array<Record<string, unknown>> }> {
  const params = new URLSearchParams()
  params.set('limit', '250')
  if (locationIds?.length) params.set('location_ids', locationIds.join(','))
  return shopifyFetch<{ inventory_levels: Array<Record<string, unknown>> }>(`/inventory_levels.json?${params.toString()}`)
}

// ─── Shopify Product → OneID PartialProduct ────────────────────────────────

export function shopifyProductToPartial(sp: ShopifyProduct, merchantId: string, shop: string): PartialProduct {
  const now = Date.now()
  const firstImage = sp.image ?? sp.images?.[0]
  const variantPrice = sp.variants?.[0]?.price
  return {
    oneId: `shopify-${shop}-${sp.id}`,
    merchantId,
    title: sp.title,
    handle: sp.handle,
    descriptionHtml: sp.body_html,
    description: sp.body_html ? stripHtml(sp.body_html) : undefined,
    vendor: sp.vendor,
    brand: sp.vendor,
    productType: sp.product_type,
    category: sp.product_type,
    tags: sp.tags ? sp.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    collections: [],
    featuredImage: firstImage ? {
      url: firstImage.src,
      kind: 'image' as const,
      alt: firstImage.alt ?? undefined,
    } : undefined,
    media: (sp.images ?? []).map((img) => ({
      url: img.src,
      kind: 'image' as const,
      alt: img.alt ?? undefined,
      width: img.width,
      height: img.height,
    })),
    price: variantPrice ? { amount: Number(variantPrice), currency: 'USD' } : undefined,
    variants: (sp.variants ?? []).map((v) => {
      const options: Record<string, string> = {}
      if (sp.options) {
        if (v.option1 && sp.options[0]) options[sp.options[0].name.toLowerCase()] = v.option1
        if (v.option2 && sp.options[1]) options[sp.options[1].name.toLowerCase()] = v.option2
        if (v.option3 && sp.options[2]) options[sp.options[2].name.toLowerCase()] = v.option3
      }
      return {
        id: String(v.id),
        sku: v.sku,
        title: v.title,
        price: v.price ? { amount: Number(v.price), currency: 'USD' } : undefined,
        compareAtPrice: v.compare_at_price ? { amount: Number(v.compare_at_price), currency: 'USD' } : undefined,
        inventory: v.inventory_quantity,
        options,
      }
    }),
    totalInventory: (sp.variants ?? []).reduce((s, v) => s + (v.inventory_quantity ?? 0), 0),
    keywords: [],
    useCases: [],
    sources: [{
      system: 'shopify' as const,
      id: String(sp.id),
      url: `https://${shop}/admin/products/${sp.id}`,
      ingestedAt: now,
    }],
    createdAt: sp.created_at ? new Date(sp.created_at).getTime() : now,
    updatedAt: sp.updated_at ? new Date(sp.updated_at).getTime() : now,
    version: 1,
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
