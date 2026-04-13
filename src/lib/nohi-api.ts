// Nohi Product Search API
const NOHI_API_BASE = "https://nohi-product-search-1049263400892.us-west1.run.app"
const NOHI_API_TOKEN = "dac91092b5cdfe190329e12dee1779be"
const DEFAULT_MERCHANT_ID = "dea414d6-87c4-4fe9-8b19-60db009eebfb"

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

/** @deprecated Use NohiSearchResult */
export type NohiSearchResponse = NohiSearchResult

export async function searchProducts(
  query: string,
  merchantId: string = DEFAULT_MERCHANT_ID
): Promise<NohiSearchResult> {
  const res = await fetch(`${NOHI_API_BASE}/api/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOHI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, merchant_id: merchantId }),
  })

  if (!res.ok) {
    throw new Error(`Nohi API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  const products: NohiProduct[] = (data.products ?? data.results ?? data.items ?? []).map(
    (p: Record<string, unknown>) => ({
      id: (p.id as string) ?? String(Math.random()),
      title: (p.title as string) ?? (p.name as string) ?? "Untitled Product",
      brand: (p.brand as string) ?? (p.brand_name as string),
      price: p.price as number,
      originalPrice: (p.original_price as number) ?? (p.compare_at_price as number),
      currency: (p.currency as string) ?? "USD",
      imageUrl: (p.image_url as string) ?? (p.image as string) ?? (p.thumbnail as string),
      url: (p.url as string) ?? (p.product_url as string),
      description: (p.description as string) ?? (p.summary as string),
      colors: (p.colors as string[]) ?? [],
      materials: (p.materials as string[]) ?? [],
      categories: (p.categories as string[]) ?? [],
      features: (p.features as string[]) ?? [],
      website: (p.website as string) ?? (p.source as string),
    })
  )

  return {
    products,
    total: (data.total as number) ?? (data.count as number) ?? products.length,
    query,
  }
}

/** @deprecated Use searchProducts */
export const searchNohiProducts = searchProducts
