// Agentic Catalog client — reads/writes products against the remote catalog API,
// with a local JSON-file cache of the last-seen snapshot (for diff + offline browsing).
//
// API base is configurable via settings.catalogApiUrl (defaults to the dev endpoint).
// Token is settings.catalogApiToken (defaults to the dev token for backward compat).
// Merchant ID is settings.merchantId (defaults to the dev merchant).

import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { OneIdProduct, PartialProduct } from './protocol'
import { checksumProduct, OneIdProductSchema, migrateProduct } from './protocol'
import { createBearerClient, HttpError } from '../lib/http'

const DEFAULT_API_BASE = 'https://nohi-product-search-1049263400892.us-west1.run.app/api'
const DEFAULT_API_TOKEN = 'dac91092b5cdfe190329e12dee1779be'
const DEFAULT_MERCHANT_ID = 'dea414d6-87c4-4fe9-8b19-60db009eebfb'

const CACHE_DIR = join(homedir(), '.nohi', 'catalog')

export interface CatalogConfig {
  apiBase: string
  apiToken: string
  merchantId: string
}

export function resolveConfig(settings: { catalogApiUrl?: string; catalogApiToken?: string; merchantId?: string }): CatalogConfig {
  return {
    apiBase: settings.catalogApiUrl?.trim() || DEFAULT_API_BASE,
    apiToken: settings.catalogApiToken?.trim() || DEFAULT_API_TOKEN,
    merchantId: settings.merchantId?.trim() || DEFAULT_MERCHANT_ID,
  }
}

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true })
}

function cachePath(oneId: string): string {
  // Sanitize oneId for filesystem — avoid path traversal via crafted oneIds
  const safe = oneId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200)
  return join(CACHE_DIR, `${safe}.json`)
}

async function writeCache(product: OneIdProduct): Promise<void> {
  await ensureCacheDir()
  await writeFile(cachePath(product.oneId), JSON.stringify(product, null, 2), 'utf-8')
}

async function readCache(oneId: string): Promise<OneIdProduct | null> {
  const p = cachePath(oneId)
  if (!existsSync(p)) return null
  try {
    const raw = await readFile(p, 'utf-8')
    const parsed = OneIdProductSchema.safeParse(migrateProduct(JSON.parse(raw)))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// ─── Remote API calls ──────────────────────────────────────────────────────

export interface SearchHit {
  oneId?: string
  title?: string
  description?: string
  price?: string | number
  currency?: string
  image_url?: string
  url?: string
  brand?: string
  category?: string
  score?: number
  [k: string]: unknown
}

function http(cfg: CatalogConfig) {
  return createBearerClient(cfg.apiToken, { baseUrl: cfg.apiBase, defaultTimeoutMs: 30_000 })
}

export async function searchRemote(cfg: CatalogConfig, query: string, limit = 10): Promise<SearchHit[]> {
  try {
    const data = await http(cfg).post<{ results?: SearchHit[] }>('/search', {
      query, merchant_id: cfg.merchantId, limit,
    })
    return data.results ?? []
  } catch (err) {
    if (err instanceof HttpError) throw new Error(`Catalog search ${err.status}: ${err.bodyPreview.slice(0, 200)}`)
    throw err
  }
}

export async function upsertRemote(cfg: CatalogConfig, product: PartialProduct): Promise<{ ok: true; oneId: string } | { ok: false; error: string }> {
  // Strategy: try the modern `/products` endpoint; if it 404s (dev backend doesn't have it yet),
  // treat it as success and rely on local cache only.
  try {
    const data = await http(cfg).post<{ oneId?: string; id?: string }>('/products', {
      merchant_id: cfg.merchantId, product,
    })
    return { ok: true, oneId: data.oneId ?? data.id ?? product.oneId ?? 'unknown' }
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 404 || err.status === 405) {
        return { ok: true, oneId: product.oneId ?? 'local-only' }
      }
      return { ok: false, error: `Catalog upsert ${err.status}: ${err.bodyPreview.slice(0, 200)}` }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function getRemote(cfg: CatalogConfig, oneId: string): Promise<OneIdProduct | null> {
  try {
    const data = await http(cfg).get<{ product?: unknown }>(`/products/${encodeURIComponent(oneId)}?merchant_id=${encodeURIComponent(cfg.merchantId)}`, {
      timeoutMs: 15_000,
    })
    const parsed = OneIdProductSchema.safeParse(migrateProduct((data.product ?? data) as Record<string, unknown>))
    return parsed.success ? parsed.data : null
  } catch (err) {
    if (err instanceof HttpError && (err.status === 404 || err.status === 405)) return null
    return null
  }
}

// ─── Public client API ─────────────────────────────────────────────────────

export async function upsertProduct(cfg: CatalogConfig, partial: PartialProduct): Promise<{ oneId: string; cachedLocally: boolean; remoteStatus: 'ok' | 'offline' | 'error'; error?: string }> {
  const now = Date.now()
  const full: OneIdProduct = {
    oneId: partial.oneId ?? `${partial.merchantId}-${crypto.randomUUID()}`,
    merchantId: partial.merchantId,
    protocolVersion: partial.protocolVersion ?? '0.1.0',
    title: partial.title,
    handle: partial.handle,
    description: partial.description,
    descriptionHtml: partial.descriptionHtml,
    summary: partial.summary,
    brand: partial.brand,
    vendor: partial.vendor,
    category: partial.category,
    productType: partial.productType,
    tags: partial.tags ?? [],
    collections: partial.collections ?? [],
    price: partial.price,
    compareAtPrice: partial.compareAtPrice,
    variants: partial.variants ?? [],
    available: partial.available,
    totalInventory: partial.totalInventory,
    media: partial.media ?? [],
    featuredImage: partial.featuredImage,
    dimensions: partial.dimensions,
    material: partial.material,
    color: partial.color,
    size: partial.size,
    metaTitle: partial.metaTitle,
    metaDescription: partial.metaDescription,
    canonicalUrl: partial.canonicalUrl,
    embedding: partial.embedding,
    keywords: partial.keywords ?? [],
    targetAudience: partial.targetAudience,
    useCases: partial.useCases ?? [],
    brandVoiceTag: partial.brandVoiceTag,
    sources: partial.sources ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
    version: (partial.version ?? 0) + 1,
    // Layer 4 fields (v0.2.0)
    attribution: partial.attribution,
    channelOverrides: partial.channelOverrides,
    orderLinks: partial.orderLinks ?? [],
    custom: partial.custom,
  }
  full.checksum = checksumProduct({ ...full })

  // Remote first, local cache regardless
  const remote = await upsertRemote(cfg, full)
  await writeCache(full)
  return {
    oneId: full.oneId,
    cachedLocally: true,
    remoteStatus: remote.ok ? 'ok' : 'error',
    error: !remote.ok ? remote.error : undefined,
  }
}

export async function getProduct(cfg: CatalogConfig, oneId: string): Promise<{ source: 'remote' | 'cache' | 'missing'; product: OneIdProduct | null }> {
  const remote = await getRemote(cfg, oneId)
  if (remote) {
    await writeCache(remote)
    return { source: 'remote', product: remote }
  }
  const cached = await readCache(oneId)
  if (cached) return { source: 'cache', product: cached }
  return { source: 'missing', product: null }
}

export async function diffProduct(cfg: CatalogConfig, oneId: string): Promise<{ exists: boolean; changed: boolean; fields: string[]; currentChecksum?: string; cachedChecksum?: string }> {
  const cached = await readCache(oneId)
  const remote = await getRemote(cfg, oneId)
  if (!cached && !remote) return { exists: false, changed: false, fields: [] }
  if (!cached && remote) return { exists: true, changed: true, fields: ['(new, no local copy)'], currentChecksum: remote.checksum }
  if (cached && !remote) return { exists: true, changed: false, fields: ['(only in local cache — remote missing)'], cachedChecksum: cached.checksum }
  if (!cached || !remote) return { exists: false, changed: false, fields: [] }

  const fields: string[] = []
  const skip = new Set(['updatedAt', 'checksum', 'version'])
  const keys = new Set([...Object.keys(cached), ...Object.keys(remote)])
  for (const k of keys) {
    if (skip.has(k)) continue
    const a = JSON.stringify((cached as Record<string, unknown>)[k])
    const b = JSON.stringify((remote as Record<string, unknown>)[k])
    if (a !== b) fields.push(k)
  }
  return {
    exists: true,
    changed: fields.length > 0,
    fields,
    currentChecksum: remote.checksum,
    cachedChecksum: cached.checksum,
  }
}

export async function listCached(): Promise<OneIdProduct[]> {
  await ensureCacheDir()
  let files: string[] = []
  try { files = await readdir(CACHE_DIR) } catch { return [] }
  const out: OneIdProduct[] = []
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    try {
      const raw = await readFile(join(CACHE_DIR, f), 'utf-8')
      const parsed = OneIdProductSchema.safeParse(migrateProduct(JSON.parse(raw)))
      if (parsed.success) out.push(parsed.data)
    } catch { /* skip */ }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}
