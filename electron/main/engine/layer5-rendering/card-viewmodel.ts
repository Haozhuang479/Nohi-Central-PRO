// CardViewModel — the subset of OneID safe for 3rd-party rendering.
// Every card surface (ChatGPT, Meta DPA, Storefront) reads this single shape
// so they stay visually consistent.

import type { OneIdProduct, ChannelId } from '../catalog/protocol'

export interface CardViewModel {
  oneId: string
  title: string
  subtitle?: string
  description: string
  summary: string
  imageUrl?: string
  extraImages: string[]
  price?: string
  comparePrice?: string
  brand?: string
  available: boolean
  inventory?: number
  rating?: number
  url: string
  tags: string[]
  badges: string[]     // "New", "Sale", "Low stock", etc.
  channelId?: ChannelId
}

/**
 * Build a CardViewModel from a OneID product + optional channel context.
 * If channelId is provided, channelOverrides[channelId] are applied.
 */
export function buildCardViewModel(product: OneIdProduct, channelId?: ChannelId): CardViewModel {
  const override = channelId ? product.channelOverrides?.[channelId] : undefined

  const title = override?.title ?? product.title
  const description = override?.description ?? product.description ?? product.summary ?? ''
  const image = override?.image ?? product.featuredImage
  const extras = (product.media ?? [])
    .filter((m) => m.kind === 'image' && m.url !== image?.url)
    .slice(0, 4)
    .map((m) => m.url)

  const price = override?.price ?? product.price
  const compare = product.compareAtPrice && price && product.compareAtPrice.amount > price.amount
    ? product.compareAtPrice
    : undefined

  const available = override?.available ?? product.available ?? (product.totalInventory ?? 1) > 0
  const badges: string[] = []
  if (!available) badges.push('Out of stock')
  if (compare) badges.push('Sale')
  if ((product.totalInventory ?? 99) > 0 && (product.totalInventory ?? 99) < 5) badges.push(`Only ${product.totalInventory} left`)

  return {
    oneId: product.oneId,
    title,
    subtitle: product.brand ?? product.vendor,
    description: stripHtml(description),
    summary: product.summary ?? stripHtml(description).slice(0, 180),
    imageUrl: image?.url,
    extraImages: extras,
    price: price ? formatMoney(price.amount, price.currency) : undefined,
    comparePrice: compare ? formatMoney(compare.amount, compare.currency) : undefined,
    brand: product.brand ?? product.vendor,
    available,
    inventory: product.totalInventory,
    url: product.canonicalUrl ?? defaultLink(product),
    tags: product.tags.slice(0, 6),
    badges,
    channelId,
  }
}

function defaultLink(p: OneIdProduct): string {
  const shopify = p.sources.find((s) => s.system === 'shopify')
  return shopify?.url ?? `https://example.com/products/${p.handle ?? p.oneId}`
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
