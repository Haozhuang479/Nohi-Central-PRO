import { describe, it, expect } from 'vitest'
import {
  OneIdProductSchema,
  PartialProductSchema,
  NOHI_PROTOCOL_VERSION,
  migrateProduct,
  ChannelIdSchema,
} from '../../electron/main/engine/catalog/protocol'

describe('Protocol v0.2.0', () => {
  it('NOHI_PROTOCOL_VERSION is 0.2.0', () => {
    expect(NOHI_PROTOCOL_VERSION).toBe('0.2.0')
  })

  it('accepts a v0.1-style product (missing Layer 4 fields) after migration', () => {
    const v01 = {
      oneId: 'p1',
      merchantId: 'm1',
      protocolVersion: '0.1.0',
      title: 'Widget',
      tags: [], collections: [], variants: [], media: [], keywords: [], useCases: [], sources: [],
      createdAt: 1, updatedAt: 2, version: 1,
    }
    const migrated = migrateProduct(v01)
    const parsed = OneIdProductSchema.safeParse(migrated)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.protocolVersion).toBe('0.2.0')
      expect(parsed.data.orderLinks).toEqual([])
      expect(parsed.data.attribution).toBeUndefined()
    }
  })

  it('accepts a product with attribution + channelOverrides', () => {
    const p = {
      oneId: 'p1',
      merchantId: 'm1',
      protocolVersion: '0.2.0',
      title: 'Widget',
      tags: [], collections: [], variants: [], media: [], keywords: [], useCases: [], sources: [],
      createdAt: 1, updatedAt: 2, version: 1,
      attribution: { utm_source: 'nohi', utm_medium: 'skill', utm_campaign: 'spring-2026' },
      channelOverrides: {
        'meta-feed': { title: 'Spring Widget', price: { amount: 19.99, currency: 'USD' } },
        'google-merchant': { description: 'Full description' },
      },
      orderLinks: [{
        orderId: 'ord-1', channelId: 'nohi-skill', amount: { amount: 50, currency: 'USD' },
        quantity: 1, timestamp: 1,
      }],
    }
    const parsed = OneIdProductSchema.safeParse(p)
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid channelId in channelOverrides', () => {
    const p = {
      oneId: 'p1', merchantId: 'm1', title: 'W',
      tags: [], collections: [], variants: [], media: [], keywords: [], useCases: [], sources: [],
      createdAt: 1, updatedAt: 2, version: 1,
      channelOverrides: { 'made-up-channel': { title: 'x' } },
    }
    expect(() => OneIdProductSchema.parse(p)).toThrow()
  })

  it('ChannelIdSchema covers owned/paid/organic', () => {
    expect(ChannelIdSchema.safeParse('nohi-skill').success).toBe(true)
    expect(ChannelIdSchema.safeParse('meta-feed').success).toBe(true)
    expect(ChannelIdSchema.safeParse('acp').success).toBe(true)
    expect(ChannelIdSchema.safeParse('totally-fake').success).toBe(false)
  })

  it('PartialProductSchema allows attribution fields optionally', () => {
    const p = {
      title: 'W', merchantId: 'm1',
      attribution: { utm_source: 'nohi' },
    }
    expect(PartialProductSchema.safeParse(p).success).toBe(true)
  })

  it('migrateProduct is idempotent on v0.2 records', () => {
    const v02 = {
      oneId: 'p1', merchantId: 'm1', protocolVersion: '0.2.0', title: 'W',
      tags: [], collections: [], variants: [], media: [], keywords: [], useCases: [], sources: [],
      createdAt: 1, updatedAt: 2, version: 1, orderLinks: [],
    }
    const migrated = migrateProduct(migrateProduct(v02))
    expect(migrated.protocolVersion).toBe('0.2.0')
  })
})
