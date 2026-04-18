import { describe, it, expect } from 'vitest'
import { buildFeedRow, selectFeedableProducts } from '../../electron/main/engine/layer4-distribution/feed/builder'
import { buildMetaCsv } from '../../electron/main/engine/layer4-distribution/feed/meta'
import { buildGoogleXml } from '../../electron/main/engine/layer4-distribution/feed/google'
import { OneIdProductSchema, type OneIdProduct } from '../../electron/main/engine/catalog/protocol'
import { buildCardViewModel } from '../../electron/main/engine/layer5-rendering/card-viewmodel'

function product(p: Partial<OneIdProduct> = {}): OneIdProduct {
  return OneIdProductSchema.parse({
    oneId: p.oneId ?? 'p-1',
    merchantId: 'm1',
    protocolVersion: '0.2.0',
    title: p.title ?? 'Widget',
    description: p.description ?? 'A useful widget',
    summary: p.summary ?? 'Short summary',
    brand: p.brand ?? 'Acme',
    category: p.category ?? 'Gadgets',
    tags: p.tags ?? ['gadget'],
    collections: [],
    media: p.media ?? [],
    featuredImage: p.featuredImage ?? { url: 'https://cdn.example.com/p1.jpg', kind: 'image' },
    variants: [],
    price: p.price ?? { amount: 29.99, currency: 'USD' },
    available: p.available ?? true,
    totalInventory: p.totalInventory ?? 100,
    keywords: [],
    useCases: [],
    sources: [],
    createdAt: 1, updatedAt: 2, version: 1, orderLinks: [],
    canonicalUrl: p.canonicalUrl ?? 'https://shop.example.com/products/widget',
    channelOverrides: p.channelOverrides,
    attribution: p.attribution,
  })
}

describe('buildFeedRow', () => {
  it('uses product defaults when no overrides', () => {
    const row = buildFeedRow(product(), { channelId: 'meta-feed' })
    expect(row.title).toBe('Widget')
    expect(row.brand).toBe('Acme')
    expect(row.price).toEqual({ amount: 29.99, currency: 'USD' })
  })

  it('applies channel overrides when present', () => {
    const p = product({
      channelOverrides: {
        'meta-feed': { title: 'Widget (Meta)', price: { amount: 19.99, currency: 'USD' } },
      },
    })
    const row = buildFeedRow(p, { channelId: 'meta-feed' })
    expect(row.title).toBe('Widget (Meta)')
    expect(row.price?.amount).toBe(19.99)
  })

  it('stamps UTM on the link for paid channels', () => {
    const row = buildFeedRow(product(), { channelId: 'meta-feed', utmCampaign: 'spring-2026' })
    expect(row.link).toContain('utm_source=meta')
    expect(row.link).toContain('utm_campaign=spring-2026')
  })

  it('stamps UTM source = nohi for owned channels', () => {
    const row = buildFeedRow(product(), { channelId: 'nohi-storefront' })
    expect(row.link).toContain('utm_source=nohi')
  })

  it('sets availability out of stock when totalInventory = 0', () => {
    const row = buildFeedRow(product({ totalInventory: 0, available: false }), { channelId: 'meta-feed' })
    expect(row.availability).toBe('out of stock')
  })
})

describe('selectFeedableProducts', () => {
  it('excludes products without a price', () => {
    const withPrice = product()
    const withoutPrice = { ...product({ oneId: 'p-2' }), price: undefined } as OneIdProduct
    const pool = selectFeedableProducts([withPrice, withoutPrice])
    expect(pool.map((p) => p.oneId)).toEqual(['p-1'])
  })

  it('filters to requested ids when provided', () => {
    const a = product({ oneId: 'a' })
    const b = product({ oneId: 'b' })
    expect(selectFeedableProducts([a, b], ['b']).map((p) => p.oneId)).toEqual(['b'])
  })
})

describe('buildMetaCsv', () => {
  it('emits a header + one row', () => {
    const row = buildFeedRow(product(), { channelId: 'meta-feed' })
    const csv = buildMetaCsv([row])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('id,title,description')
    expect(lines[1]).toMatch(/^p-1,Widget/)
  })

  it('quotes cells containing commas or quotes', () => {
    const row = buildFeedRow(product({ title: 'Widget, Deluxe' }), { channelId: 'meta-feed' })
    const csv = buildMetaCsv([row])
    expect(csv).toContain('"Widget, Deluxe"')
  })
})

describe('buildGoogleXml', () => {
  it('emits valid RSS with g: namespace', () => {
    const row = buildFeedRow(product(), { channelId: 'google-merchant' })
    const xml = buildGoogleXml([row], { title: 'Store', link: 'https://store.example.com', description: 'Feed' })
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    expect(xml).toContain('<g:id>p-1</g:id>')
    expect(xml).toContain('<g:price>29.99 USD</g:price>')
    expect(xml).toContain('<g:availability>in_stock</g:availability>')
  })

  it('escapes special chars in attributes', () => {
    const row = buildFeedRow(product({ title: '<tag> & "quote"' }), { channelId: 'google-merchant' })
    const xml = buildGoogleXml([row], { title: 'Store', link: 'https://s', description: 'F' })
    // Title uses CDATA so angle brackets and quotes pass through verbatim
    expect(xml).toContain('<![CDATA[<tag> & "quote"]]>')
  })
})

describe('buildCardViewModel', () => {
  it('builds a viewmodel from a OneID product', () => {
    const vm = buildCardViewModel(product())
    expect(vm.title).toBe('Widget')
    expect(vm.price).toMatch(/29\.99|29/)
    expect(vm.available).toBe(true)
    expect(vm.badges).toEqual([])
  })

  it('adds a "Sale" badge when compareAtPrice > price', () => {
    const p = {
      ...product(),
      compareAtPrice: { amount: 49.99, currency: 'USD' },
    } as OneIdProduct
    const vm = buildCardViewModel(p)
    expect(vm.badges).toContain('Sale')
    expect(vm.comparePrice).toBeTruthy()
  })

  it('applies channel-specific overrides', () => {
    const p = product({
      channelOverrides: {
        'meta-feed': { title: 'Widget (Meta edition)' },
      },
    })
    const vm = buildCardViewModel(p, 'meta-feed')
    expect(vm.title).toBe('Widget (Meta edition)')
  })

  it('adds a low-stock badge when inventory < 5', () => {
    const p = product({ totalInventory: 3 })
    const vm = buildCardViewModel(p)
    expect(vm.badges.some((b) => b.includes('3 left'))).toBe(true)
  })
})
