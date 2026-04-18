// Nohi Protocol — canonical schema for an "agent-native product".
// Every product in the Agentic Catalog has a OneID record validated against this schema.
// The protocol version is bumped when the schema changes in a non-backwards-compatible way.

import { z } from 'zod'

export const NOHI_PROTOCOL_VERSION = '0.1.0'

// ─── Core attribute schemas ───────────────────────────────────────────────

const MoneySchema = z.object({
  amount: z.number().min(0),
  currency: z.string().length(3), // ISO 4217
})

const DimensionsSchema = z.object({
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  unit: z.enum(['cm', 'in', 'g', 'kg', 'lb']).optional(),
})

const MediaSchema = z.object({
  url: z.string().url(),
  kind: z.enum(['image', 'video']),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

const VariantSchema = z.object({
  id: z.string(),
  sku: z.string().optional(),
  title: z.string().optional(),
  price: MoneySchema.optional(),
  compareAtPrice: MoneySchema.optional(),
  inventory: z.number().int().optional(),
  options: z.record(z.string(), z.string()).optional(), // e.g., { color: 'red', size: 'M' }
  media: z.array(MediaSchema).optional(),
})

const SourceRefSchema = z.object({
  system: z.enum(['shopify', 'gdrive', 'csv', 'manual', 'web', 'extracted']),
  id: z.string().optional(), // upstream product id (e.g. shopify gid)
  url: z.string().url().optional(),
  ingestedAt: z.number(), // unix ms
})

// ─── OneID Product schema ─────────────────────────────────────────────────

export const OneIdProductSchema = z.object({
  // Identity
  oneId: z.string().min(1).describe('Canonical Nohi Product ID (UUID v7 or similar)'),
  merchantId: z.string().min(1),
  protocolVersion: z.string().default(NOHI_PROTOCOL_VERSION),

  // Primary attributes
  title: z.string().min(1).max(500),
  handle: z.string().optional(), // URL slug
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  summary: z.string().max(500).optional(), // 1-2 sentence agent-friendly summary
  brand: z.string().optional(),
  vendor: z.string().optional(),

  // Categorization
  category: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).default([]),
  collections: z.array(z.string()).default([]),

  // Commerce
  price: MoneySchema.optional(),
  compareAtPrice: MoneySchema.optional(),
  variants: z.array(VariantSchema).default([]),
  available: z.boolean().optional(),
  totalInventory: z.number().int().optional(),

  // Media
  media: z.array(MediaSchema).default([]),
  featuredImage: MediaSchema.optional(),

  // Physical attributes
  dimensions: DimensionsSchema.optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),

  // SEO / surface attributes
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(200).optional(),
  canonicalUrl: z.string().url().optional(),

  // Agent-native extras
  embedding: z.array(z.number()).optional().describe('Semantic vector (stored server-side usually)'),
  keywords: z.array(z.string()).default([]),
  targetAudience: z.string().optional(),
  useCases: z.array(z.string()).default([]),
  brandVoiceTag: z.string().optional(), // points at a brand-voice profile

  // Provenance & versioning
  sources: z.array(SourceRefSchema).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().int().default(1),
  checksum: z.string().optional(),

  // Free-form for forward-compat
  custom: z.record(z.string(), z.unknown()).optional(),
})

export type OneIdProduct = z.infer<typeof OneIdProductSchema>

// A "partial product" — what an ingestion pipeline hands in before structuring.
// Every field may be missing except title; the agent's job is to complete it.
export const PartialProductSchema = OneIdProductSchema.partial().extend({
  title: z.string().min(1),
  merchantId: z.string().min(1),
})

export type PartialProduct = z.infer<typeof PartialProductSchema>

// ─── Validation helpers ───────────────────────────────────────────────────

export interface ValidationIssue {
  path: string
  severity: 'error' | 'warning'
  message: string
}

/** Validates a product against the full Protocol. Returns a list of issues. */
export function validateProduct(raw: unknown): { valid: boolean; issues: ValidationIssue[] } {
  const parsed = OneIdProductSchema.safeParse(raw)
  if (parsed.success) {
    const product = parsed.data
    const warnings = computeQualityWarnings(product)
    return { valid: true, issues: warnings }
  }
  const errors: ValidationIssue[] = parsed.error.issues.map((i) => ({
    path: i.path.join('.') || 'root',
    severity: 'error' as const,
    message: i.message,
  }))
  return { valid: false, issues: errors }
}

/** Quality warnings — structurally valid but missing fields that hurt agent legibility. */
function computeQualityWarnings(p: OneIdProduct): ValidationIssue[] {
  const out: ValidationIssue[] = []
  if (!p.summary) out.push({ path: 'summary', severity: 'warning', message: 'Missing agent-friendly 1-2 sentence summary' })
  if (!p.description) out.push({ path: 'description', severity: 'warning', message: 'No long-form description' })
  if (p.media.length === 0) out.push({ path: 'media', severity: 'warning', message: 'No media (hurts product card rendering)' })
  if (!p.featuredImage) out.push({ path: 'featuredImage', severity: 'warning', message: 'No featured image set' })
  if (!p.category) out.push({ path: 'category', severity: 'warning', message: 'No category (hurts discovery)' })
  if (p.tags.length === 0) out.push({ path: 'tags', severity: 'warning', message: 'No tags' })
  if (!p.metaDescription) out.push({ path: 'metaDescription', severity: 'warning', message: 'No meta description (hurts SEO + some channel feeds)' })
  if (!p.price && p.variants.length === 0) out.push({ path: 'price', severity: 'warning', message: 'No price at product or variant level' })
  if (!p.brand && !p.vendor) out.push({ path: 'brand', severity: 'warning', message: 'No brand/vendor' })
  if (!p.targetAudience) out.push({ path: 'targetAudience', severity: 'warning', message: 'No target audience — agent recommendations will be generic' })
  return out
}

/** Compute a "catalog readiness score" 0-100 for a product. */
export function catalogReadinessScore(p: OneIdProduct): number {
  const weights: Array<[boolean, number]> = [
    [!!p.title && p.title.length > 3, 10],
    [!!p.description, 10],
    [!!p.summary, 8],
    [p.media.length > 0, 10],
    [!!p.featuredImage, 5],
    [!!p.category, 10],
    [p.tags.length >= 3, 5],
    [!!p.price || p.variants.some((v) => !!v.price), 10],
    [!!p.brand || !!p.vendor, 5],
    [!!p.metaDescription, 7],
    [!!p.targetAudience, 5],
    [p.keywords.length >= 3, 5],
    [!!p.material || !!p.color || !!p.size || !!p.dimensions, 5],
    [p.variants.length > 0, 5],
  ]
  const total = weights.reduce((s, [, w]) => s + w, 0)
  const got = weights.reduce((s, [ok, w]) => s + (ok ? w : 0), 0)
  return Math.round((got / total) * 100)
}

/** Compute a checksum so catalog_diff can detect real changes cheaply. */
export function checksumProduct(p: Omit<OneIdProduct, 'checksum' | 'updatedAt'>): string {
  const stable = JSON.stringify(p, Object.keys(p).sort())
  // Simple djb2 — good enough for change detection (not cryptographic).
  let h = 5381
  for (let i = 0; i < stable.length; i++) h = ((h << 5) + h + stable.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}
