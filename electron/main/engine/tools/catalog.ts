// Catalog tools — agent-facing wrappers around the Agentic Catalog client.
// Supersedes the older product_search / product_upload tools for new code paths.

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { resolveConfig, searchRemote, upsertProduct, getProduct, diffProduct } from '../catalog/client'
import { PartialProductSchema, validateProduct, catalogReadinessScore, NOHI_PROTOCOL_VERSION } from '../catalog/protocol'

function settingsAsCatalog(opts: ToolCallOpts): ReturnType<typeof resolveConfig> {
  const s = (opts.settings ?? {}) as Record<string, unknown>
  return resolveConfig({
    catalogApiUrl: s.catalogApiUrl as string | undefined,
    catalogApiToken: s.catalogApiToken as string | undefined,
    merchantId: s.merchantId as string | undefined,
  })
}

export const CatalogSearchTool: ToolDef = {
  name: 'catalog_search',
  description:
    'Semantic search over the Agentic Catalog. Use natural language queries — embeddings match intent, not keywords. Returns matching products with title, price, brand, and URL. Prefer this over enumerating Shopify when the user asks "find all products that …".',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural-language description of what you\'re looking for.' },
      limit: { type: 'number', description: '1-50, default 10.' },
    },
    required: ['query'],
  },
  async call(input, opts): Promise<ToolResult> {
    const cfg = settingsAsCatalog(opts)
    try {
      const hits = await searchRemote(cfg, input.query as string, Math.min(Math.max((input.limit as number | undefined) ?? 10, 1), 50))
      if (hits.length === 0) return { output: `No products matched "${input.query as string}".` }
      const lines = hits.map((r, i) => {
        const parts = [`${i + 1}. **${r.title ?? 'Untitled'}**`]
        if (r.price) parts.push(`   Price: ${r.currency ?? '$'}${r.price}`)
        if (r.brand) parts.push(`   Brand: ${r.brand}`)
        if (r.category) parts.push(`   Category: ${r.category}`)
        if (r.description) parts.push(`   ${String(r.description).slice(0, 140)}`)
        if (r.oneId) parts.push(`   oneId: ${r.oneId}`)
        if (r.url) parts.push(`   URL: ${r.url}`)
        return parts.join('\n')
      }).join('\n\n')
      return { output: `Found ${hits.length} products:\n\n${lines}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const CatalogGetProductTool: ToolDef = {
  name: 'catalog_get_product',
  description: 'Fetch a product by OneID. Tries the catalog server first, falls back to local cache. Returns the full structured record including variants, media, tags, and readiness score.',
  inputSchema: {
    type: 'object',
    properties: {
      one_id: { type: 'string' },
    },
    required: ['one_id'],
  },
  async call(input, opts): Promise<ToolResult> {
    const cfg = settingsAsCatalog(opts)
    try {
      const { source, product } = await getProduct(cfg, input.one_id as string)
      if (!product) return { output: `Product not found: ${input.one_id as string}` }
      const score = catalogReadinessScore(product)
      return {
        output: `Source: ${source}  ·  Readiness: ${score}/100\n\n\`\`\`json\n${JSON.stringify(product, null, 2)}\n\`\`\``,
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const CatalogUpsertProductTool: ToolDef = {
  name: 'catalog_upsert_product',
  description:
    'Create or update a product in the Agentic Catalog. Accepts a partial product object — the server fills in defaults and generates a OneID if missing. Always writes to local cache too. Use this after ingestion (Shopify/Drive) or after enrichment (vision, brand-voice rewrite).',
  inputSchema: {
    type: 'object',
    properties: {
      product: {
        type: 'object',
        description: 'Partial OneID product. Required: title, merchantId. See validate_protocol for full schema.',
      },
    },
    required: ['product'],
  },
  async call(input, opts): Promise<ToolResult> {
    const cfg = settingsAsCatalog(opts)
    const parsed = PartialProductSchema.safeParse(input.product)
    if (!parsed.success) {
      const msg = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return { error: `Invalid product: ${msg}` }
    }
    try {
      const r = await upsertProduct(cfg, parsed.data)
      const warn = r.remoteStatus !== 'ok' ? `\n⚠️ Remote write failed (${r.error ?? 'unknown'}). Cached locally — will reconcile on next sync.` : ''
      return { output: `Upserted ${r.oneId}  ·  remote: ${r.remoteStatus}  ·  cache: ${r.cachedLocally}${warn}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const CatalogDiffTool: ToolDef = {
  name: 'catalog_diff',
  description: 'Compare a product\'s last-cached snapshot against the current remote version. Returns the list of changed top-level fields.',
  inputSchema: {
    type: 'object',
    properties: {
      one_id: { type: 'string' },
    },
    required: ['one_id'],
  },
  async call(input, opts): Promise<ToolResult> {
    const cfg = settingsAsCatalog(opts)
    try {
      const d = await diffProduct(cfg, input.one_id as string)
      if (!d.exists) return { output: `${input.one_id as string}: not found in cache or remote.` }
      if (!d.changed) return { output: `${input.one_id as string}: unchanged since last snapshot.` }
      const hdr = `${input.one_id as string}  ·  changed fields:`
      return { output: `${hdr}\n${d.fields.map((f) => `- ${f}`).join('\n')}\n\ncurrent checksum: ${d.currentChecksum ?? '—'}\ncached checksum:  ${d.cachedChecksum ?? '—'}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const CatalogValidateProtocolTool: ToolDef = {
  name: 'catalog_validate_protocol',
  description:
    `Validate a product against Nohi Protocol ${NOHI_PROTOCOL_VERSION}. Returns (a) hard errors that block upsert, (b) quality warnings (missing fields that hurt agent legibility), and (c) a 0–100 readiness score.`,
  inputSchema: {
    type: 'object',
    properties: {
      product: { type: 'object', description: 'Product to validate. Same shape as catalog_upsert_product.' },
    },
    required: ['product'],
  },
  async call(input): Promise<ToolResult> {
    const v = validateProduct(input.product)
    const errors = v.issues.filter((i) => i.severity === 'error')
    const warnings = v.issues.filter((i) => i.severity === 'warning')
    const score = v.valid ? catalogReadinessScore(input.product as Parameters<typeof catalogReadinessScore>[0]) : 0

    const lines: string[] = []
    lines.push(`Protocol: ${NOHI_PROTOCOL_VERSION}`)
    lines.push(`Valid: ${v.valid ? 'yes' : 'NO (has errors)'}`)
    lines.push(`Readiness: ${score}/100`)
    if (errors.length > 0) {
      lines.push('', '**Errors (block upsert):**')
      for (const e of errors) lines.push(`- ${e.path}: ${e.message}`)
    }
    if (warnings.length > 0) {
      lines.push('', '**Quality warnings:**')
      for (const w of warnings) lines.push(`- ${w.path}: ${w.message}`)
    }
    if (errors.length === 0 && warnings.length === 0) {
      lines.push('', '✓ Perfect agent-native record.')
    }
    return { output: lines.join('\n') }
  },
}
