// Shared catalog client for the renderer. Routes through the main process IPC so
// there is ONE code path hitting the Agentic Catalog — same as the agent's
// `catalog_search` tool. Use `window.nohi.catalog.search()` directly in new code;
// this module just preserves the `NohiProduct` viewmodel the seller catalog page expects.

export interface NohiProduct {
  id: string
  title: string
  brand?: string
  price?: number
  originalPrice?: number
  currency?: string
  imageUrl?: string
  url?: string
  description?: string
  colors?: string[]
  materials?: string[]
  categories?: string[]
  features?: string[]
  website?: string
}

export interface NohiSearchResult {
  products: NohiProduct[]
  total: number
  query: string
}

function toProduct(raw: Record<string, unknown>): NohiProduct {
  return {
    id: (raw.id as string) ?? (raw.oneId as string) ?? String(Math.random()),
    title: (raw.title as string) ?? (raw.name as string) ?? 'Untitled Product',
    brand: (raw.brand as string) ?? (raw.brand_name as string),
    price: raw.price as number | undefined,
    originalPrice: (raw.original_price as number) ?? (raw.compare_at_price as number),
    currency: (raw.currency as string) ?? 'USD',
    imageUrl: (raw.image_url as string) ?? (raw.image as string) ?? (raw.thumbnail as string),
    url: (raw.url as string) ?? (raw.product_url as string),
    description: (raw.description as string) ?? (raw.summary as string),
    colors: (raw.colors as string[]) ?? [],
    materials: (raw.materials as string[]) ?? [],
    categories: (raw.categories as string[]) ?? [],
    features: (raw.features as string[]) ?? [],
    website: (raw.website as string) ?? (raw.source as string),
  }
}

/**
 * Search the Agentic Catalog. Uses the shared main-process client, so the request
 * path, auth, and local cache behavior are identical whether the agent calls
 * `catalog_search` or the seller UI calls this.
 */
export async function searchProducts(query: string, limit = 20): Promise<NohiSearchResult> {
  if (typeof window === 'undefined' || !window.nohi?.catalog) {
    throw new Error('Catalog IPC not available. Is the app running in Electron?')
  }
  const resp = await window.nohi.catalog.search(query, limit)
  if (!resp.ok) throw new Error(resp.error)
  const products = resp.results.map(toProduct)
  return { products, total: resp.total, query: resp.query }
}
