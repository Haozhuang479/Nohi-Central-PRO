// ProductSearchTool — Nohi Product Search API integration
// Supports: search products, upload catalog CSV

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'

const API_BASE = 'https://nohi-product-search-1049263400892.us-west1.run.app/api'
const API_TOKEN = 'dac91092b5cdfe190329e12dee1779be'
const DEFAULT_MERCHANT_ID = 'dea414d6-87c4-4fe9-8b19-60db009eebfb'

export const ProductSearchTool: ToolDef = {
  name: 'product_search',
  description:
    'Search the Nohi product catalog using natural language. Returns matching products with details like title, price, description, and images. Use this for finding products, checking inventory, or answering customer questions about available items.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query, e.g. "blue running shoes under $100" or "organic coffee beans".',
      },
      merchant_id: {
        type: 'string',
        description: 'Merchant ID to search within. Uses the default merchant if not provided.',
      },
    },
    required: ['query'],
  },

  async call(input, _opts: ToolCallOpts): Promise<ToolResult> {
    const query = input.query as string
    const merchantId = (input.merchant_id as string | undefined) ?? DEFAULT_MERCHANT_ID

    try {
      const resp = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, merchant_id: merchantId }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        return { error: `Product search failed: ${resp.status} ${errText.slice(0, 200)}` }
      }

      const data = await resp.json() as {
        results?: Array<{
          title?: string
          description?: string
          price?: string | number
          currency?: string
          image_url?: string
          url?: string
          brand?: string
          category?: string
          [k: string]: unknown
        }>
        total?: number
        [k: string]: unknown
      }

      const results = data.results ?? []
      if (results.length === 0) {
        return { output: `No products found for "${query}".` }
      }

      const formatted = results.slice(0, 10).map((r, i) => {
        const parts = [`${i + 1}. **${r.title ?? 'Untitled'}**`]
        if (r.price) parts.push(`   Price: ${r.currency ?? '$'}${r.price}`)
        if (r.brand) parts.push(`   Brand: ${r.brand}`)
        if (r.category) parts.push(`   Category: ${r.category}`)
        if (r.description) parts.push(`   ${(r.description as string).slice(0, 150)}`)
        if (r.url) parts.push(`   URL: ${r.url}`)
        return parts.join('\n')
      }).join('\n\n')

      const summary = `Found ${data.total ?? results.length} products for "${query}":\n\n${formatted}`
      return { output: summary }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (e.name === 'TimeoutError') return { error: 'Product search timed out after 30s' }
      return { error: e.message ?? 'Product search failed' }
    }
  },
}

export const ProductUploadTool: ToolDef = {
  name: 'product_upload',
  description:
    'Upload a CSV file to the Nohi product catalog. The CSV should contain product data with columns like title, description, price, image_url, etc. Use this to import or update the product catalog.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the CSV file to upload.',
      },
      merchant_id: {
        type: 'string',
        description: 'Merchant ID. Uses the default merchant if not provided.',
      },
    },
    required: ['file_path'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    const { readFile } = await import('fs/promises')
    const { resolve, basename } = await import('path')

    const rawPath = input.file_path as string
    const filePath = resolve(opts.workingDir, rawPath)
    const merchantId = (input.merchant_id as string | undefined) ?? DEFAULT_MERCHANT_ID

    // Validate path is within working directory
    if (opts.workingDir && !filePath.startsWith(resolve(opts.workingDir))) {
      return { error: 'Access denied: path is outside working directory' }
    }

    try {
      const fileBuffer = await readFile(filePath)
      const fileName = basename(filePath)

      // Build multipart form data manually (Node.js native)
      const boundary = `----NohiUpload${Date.now()}`
      const parts: Buffer[] = []

      // merchant_id field
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="merchant_id"\r\n\r\n${merchantId}\r\n`
      ))

      // file field
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/csv\r\n\r\n`
      ))
      parts.push(fileBuffer)
      parts.push(Buffer.from('\r\n'))

      // closing boundary
      parts.push(Buffer.from(`--${boundary}--\r\n`))

      const body = Buffer.concat(parts)

      const resp = await fetch(`${API_BASE}/dev/products/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
        signal: AbortSignal.timeout(60_000),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        return { error: `Upload failed: ${resp.status} ${errText.slice(0, 200)}` }
      }

      const data = await resp.json() as { message?: string; count?: number; [k: string]: unknown }
      return { output: data.message ?? `Uploaded ${fileName} successfully. ${data.count ?? ''} products processed.` }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'ENOENT') return { error: `File not found: ${filePath}` }
      return { error: e.message ?? 'Upload failed' }
    }
  },
}
