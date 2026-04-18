import { describe, it, expect } from 'vitest'
import {
  OneIdProductSchema,
  PartialProductSchema,
  validateProduct,
  catalogReadinessScore,
  checksumProduct,
  NOHI_PROTOCOL_VERSION,
} from '../../electron/main/engine/catalog/protocol'

const minimalProduct = {
  oneId: 'test-1',
  merchantId: 'm1',
  protocolVersion: NOHI_PROTOCOL_VERSION,
  title: 'Test Product',
  tags: [],
  collections: [],
  variants: [],
  media: [],
  keywords: [],
  useCases: [],
  sources: [],
  createdAt: 1,
  updatedAt: 2,
  version: 1,
}

describe('OneIdProductSchema', () => {
  it('accepts a minimal product', () => {
    expect(() => OneIdProductSchema.parse(minimalProduct)).not.toThrow()
  })

  it('rejects a product missing title', () => {
    const bad = { ...minimalProduct, title: '' }
    expect(() => OneIdProductSchema.parse(bad)).toThrow()
  })

  it('rejects invalid currency (not 3 chars)', () => {
    const bad = { ...minimalProduct, price: { amount: 10, currency: 'USDD' } }
    expect(() => OneIdProductSchema.parse(bad)).toThrow()
  })

  it('rejects metaTitle over 70 chars', () => {
    const bad = { ...minimalProduct, metaTitle: 'x'.repeat(71) }
    expect(() => OneIdProductSchema.parse(bad)).toThrow()
  })
})

describe('PartialProductSchema', () => {
  it('accepts minimal fields (title + merchantId)', () => {
    expect(() => PartialProductSchema.parse({ title: 'T', merchantId: 'm1' })).not.toThrow()
  })
  it('rejects missing title', () => {
    expect(() => PartialProductSchema.parse({ merchantId: 'm1' })).toThrow()
  })
})

describe('validateProduct', () => {
  it('reports errors for invalid input', () => {
    const result = validateProduct({ not: 'a product' })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.severity === 'error')).toBe(true)
  })

  it('reports quality warnings for structurally valid but sparse products', () => {
    const result = validateProduct(minimalProduct)
    expect(result.valid).toBe(true)
    const warningPaths = result.issues.filter((i) => i.severity === 'warning').map((i) => i.path)
    expect(warningPaths).toContain('summary')
    expect(warningPaths).toContain('description')
    expect(warningPaths).toContain('media')
  })

  it('gives no warnings for a well-populated product', () => {
    const good = {
      ...minimalProduct,
      title: 'Amazing Widget',
      summary: 'A great widget for home use.',
      description: 'Detailed description…',
      featuredImage: { url: 'https://example.com/img.png', kind: 'image' as const },
      media: [{ url: 'https://example.com/img.png', kind: 'image' as const }],
      category: 'Widgets',
      tags: ['home', 'widget', 'utility'],
      metaDescription: 'A great widget for home use.',
      price: { amount: 29.99, currency: 'USD' },
      brand: 'Acme',
      targetAudience: 'home users',
    }
    const result = validateProduct(good)
    expect(result.valid).toBe(true)
    expect(result.issues.filter((i) => i.severity === 'warning')).toEqual([])
  })
})

describe('catalogReadinessScore', () => {
  it('returns a low score for a sparse product', () => {
    const parsed = OneIdProductSchema.parse(minimalProduct)
    const score = catalogReadinessScore(parsed)
    expect(score).toBeLessThan(30)
  })
  it('returns a high score for a fully-populated product', () => {
    const good = OneIdProductSchema.parse({
      ...minimalProduct,
      title: 'Amazing Widget',
      summary: 'Summary',
      description: 'Description',
      featuredImage: { url: 'https://example.com/x.png', kind: 'image' as const },
      media: [{ url: 'https://example.com/x.png', kind: 'image' as const }],
      category: 'Widgets',
      tags: ['a', 'b', 'c'],
      metaDescription: 'Meta',
      price: { amount: 10, currency: 'USD' },
      brand: 'Acme',
      targetAudience: 'people',
      keywords: ['k1', 'k2', 'k3'],
      material: 'steel',
      variants: [{ id: 'v1' }],
    })
    const score = catalogReadinessScore(good)
    expect(score).toBeGreaterThan(90)
  })
})

describe('checksumProduct', () => {
  it('produces stable checksums for identical input', () => {
    const a = checksumProduct(minimalProduct as Parameters<typeof checksumProduct>[0])
    const b = checksumProduct(minimalProduct as Parameters<typeof checksumProduct>[0])
    expect(a).toBe(b)
  })
  it('produces different checksums for different input', () => {
    const a = checksumProduct(minimalProduct as Parameters<typeof checksumProduct>[0])
    const b = checksumProduct({ ...minimalProduct, title: 'Changed' } as Parameters<typeof checksumProduct>[0])
    expect(a).not.toBe(b)
  })
})
