// Shared feed builder.
//
// Every channel adapter (Meta, Google, Reddit) starts from the same primitive:
// take OneID products → apply per-channel overrides → stamp UTM → format as
// target file shape. This module factors out the first three steps so each
// adapter is a tiny "row formatter".

import type { OneIdProduct, ChannelId } from '../../catalog/protocol'

export interface FeedContext {
  channelId: ChannelId
  /** UTM campaign stamp applied to every product URL in the feed. */
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

/**
 * Resolved feed row — the product's fields after channel overrides + UTM.
 * Adapters take a FeedRow[] and format it into their target shape (CSV/XML/JSON).
 */
export interface FeedRow {
  oneId: string
  title: string
  description: string
  link: string
  imageLink?: string
  additionalImageLinks: string[]
  availability: 'in stock' | 'out of stock' | 'preorder'
  price: { amount: number; currency: string } | undefined
  salePrice: { amount: number; currency: string } | undefined
  brand?: string
  condition: 'new' | 'refurbished' | 'used'
  category?: string
  productType?: string
  itemGroupId?: string
  gtin?: string
  mpn?: string
  color?: string
  size?: string
  material?: string
  customData: Record<string, unknown>
}

/**
 * Turn a raw catalog product into a FeedRow for this specific channel.
 * Applies channelOverrides and UTM tagging.
 */
export function buildFeedRow(product: OneIdProduct, ctx: FeedContext): FeedRow {
  const override = product.channelOverrides?.[ctx.channelId] ?? {}

  const title = override.title ?? product.title
  const description = override.description ?? product.description ?? product.summary ?? title
  const image = override.image ?? product.featuredImage
  const extraImages = (product.media ?? [])
    .filter((m) => m.kind === 'image' && m.url !== image?.url)
    .slice(0, 10)
    .map((m) => m.url)

  const available = override.available ?? product.available
  const availability: FeedRow['availability'] =
    available === false ? 'out of stock'
    : (product.totalInventory ?? 1) > 0 ? 'in stock'
    : 'out of stock'

  const price = override.price ?? product.price
  const salePrice = product.compareAtPrice && price && product.compareAtPrice.amount > price.amount
    ? price
    : undefined

  const link = stampUtm(
    product.canonicalUrl ?? defaultLinkFor(product),
    {
      utm_source: ctx.channelId.startsWith('nohi-') ? 'nohi' : ctx.channelId.split('-')[0],
      utm_medium: channelKindOf(ctx.channelId),
      utm_campaign: ctx.utmCampaign ?? product.attribution?.utm_campaign,
      utm_term: ctx.utmTerm ?? product.attribution?.utm_term,
      utm_content: ctx.utmContent ?? product.attribution?.utm_content,
    },
  )

  return {
    oneId: product.oneId,
    title,
    description: stripHtml(description).slice(0, 5000),
    link,
    imageLink: image?.url,
    additionalImageLinks: extraImages,
    availability,
    price,
    salePrice: salePrice ? product.compareAtPrice : undefined,
    brand: product.brand ?? product.vendor,
    condition: 'new',
    category: product.category,
    productType: product.productType,
    itemGroupId: product.handle,
    color: product.color,
    size: product.size,
    material: product.material,
    customData: (override.customData ?? {}) as Record<string, unknown>,
  }
}

function channelKindOf(id: ChannelId): string {
  if (id.startsWith('nohi-')) return id.replace('nohi-', '')
  if (id === 'meta-feed' || id === 'google-merchant' || id === 'reddit-dpa' || id === 'tiktok-shop') return 'cpc'
  return 'organic'
}

function defaultLinkFor(product: OneIdProduct): string {
  const shopify = product.sources.find((s) => s.system === 'shopify')
  if (shopify?.url) return shopify.url
  if (product.handle) return `https://example.com/products/${product.handle}`
  return `https://example.com/products/${product.oneId}`
}

function stampUtm(rawUrl: string, params: Record<string, string | undefined>): string {
  try {
    const url = new URL(rawUrl)
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v)
    }
    return url.toString()
  } catch {
    // Fall back to appending manually if URL parsing fails
    const q = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
    return q ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}${q}` : rawUrl
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Filter catalog to the requested product ids (or all if empty).
 * Also drops products that aren't distribution-ready (no title, no price).
 */
export function selectFeedableProducts(catalog: OneIdProduct[], ids?: string[]): OneIdProduct[] {
  const pool = ids && ids.length > 0
    ? catalog.filter((p) => ids.includes(p.oneId))
    : catalog
  return pool.filter((p) => {
    if (!p.title) return false
    const hasPrice = !!p.price || p.variants.some((v) => !!v.price)
    return hasPrice
  })
}
