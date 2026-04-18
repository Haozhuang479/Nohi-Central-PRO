import { describe, it, expect } from 'vitest'
import { summarize, NohiOrderSchema, type NohiOrder } from '../../electron/main/engine/layer4-distribution/attribution/orders'

function order(p: Partial<NohiOrder>): NohiOrder {
  return NohiOrderSchema.parse({
    id: p.id ?? 'ord',
    merchantId: p.merchantId ?? 'm1',
    sourceSystem: p.sourceSystem ?? 'shopify',
    sourceOrderId: p.sourceOrderId ?? '1',
    total: p.total ?? { amount: 100, currency: 'USD' },
    products: p.products ?? [{
      quantity: 1,
      lineTotal: { amount: 100, currency: 'USD' },
    }],
    channelId: p.channelId,
    utmSource: p.utmSource,
    utmMedium: p.utmMedium,
    utmCampaign: p.utmCampaign,
    createdAt: p.createdAt ?? 1,
    ingestedAt: p.ingestedAt ?? 1,
  })
}

describe('summarize', () => {
  it('sums totals and breaks down by kind', () => {
    const s = summarize([
      order({ id: '1', channelId: 'nohi-skill', total: { amount: 100, currency: 'USD' } }),
      order({ id: '2', channelId: 'nohi-storefront', total: { amount: 200, currency: 'USD' } }),
      order({ id: '3', channelId: 'meta-feed', total: { amount: 300, currency: 'USD' } }),
      order({ id: '4', total: { amount: 50, currency: 'USD' } }),  // unattributed
    ])
    expect(s.total.orders).toBe(4)
    expect(s.total.gmv.amount).toBe(650)
    expect(s.byKind.owned.orders).toBe(2)
    expect(s.byKind.owned.gmv).toBe(300)
    expect(s.byKind.paid.orders).toBe(1)
    expect(s.byKind.paid.gmv).toBe(300)
    expect(s.byKind.unattributed.orders).toBe(1)
    expect(s.byKind.unattributed.gmv).toBe(50)
  })

  it('computes per-channel AOV', () => {
    const s = summarize([
      order({ id: '1', channelId: 'meta-feed', total: { amount: 50, currency: 'USD' } }),
      order({ id: '2', channelId: 'meta-feed', total: { amount: 150, currency: 'USD' } }),
    ])
    expect(s.byChannel['meta-feed'].orders).toBe(2)
    expect(s.byChannel['meta-feed'].gmv).toBe(200)
    expect(s.byChannel['meta-feed'].aov).toBe(100)
  })

  it('returns empty buckets on no input', () => {
    const s = summarize([])
    expect(s.total.orders).toBe(0)
    expect(s.byKind.owned.orders).toBe(0)
    expect(Object.keys(s.byChannel)).toHaveLength(0)
  })

  it('collects unique channels per kind', () => {
    const s = summarize([
      order({ id: '1', channelId: 'nohi-skill' }),
      order({ id: '2', channelId: 'nohi-skill' }),
      order({ id: '3', channelId: 'nohi-storefront' }),
    ])
    expect(s.byKind.owned.channels.sort()).toEqual(['nohi-skill', 'nohi-storefront'])
  })
})

describe('NohiOrderSchema', () => {
  it('requires id, merchantId, total, products[].quantity, createdAt', () => {
    expect(() => NohiOrderSchema.parse({})).toThrow()
  })

  it('validates channelId is a known ChannelId', () => {
    const bad = {
      id: 'x', merchantId: 'm', sourceSystem: 'shopify', sourceOrderId: '1',
      total: { amount: 1, currency: 'USD' },
      products: [{ quantity: 1, lineTotal: { amount: 1, currency: 'USD' } }],
      channelId: 'not-a-real-channel',
      createdAt: 1, ingestedAt: 1,
    }
    expect(() => NohiOrderSchema.parse(bad)).toThrow()
  })
})
