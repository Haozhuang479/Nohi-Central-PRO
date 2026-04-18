// Shopify tools — agent-facing wrappers around the Shopify Admin API connector.

import type { ToolDef, ToolResult } from '../types'
import { listProducts, getProduct, updateProduct, getOrders, getInventoryLevels, getShopifyCreds } from '../connectors/shopify'

async function assertConnected(): Promise<{ error: string } | null> {
  const creds = await getShopifyCreds()
  if (!creds) return { error: 'Shopify is not connected. Ask the user to connect it in Settings → Connectors (they need to paste an Admin API access token from a Shopify Custom App).' }
  return null
}

export const ShopifyListProductsTool: ToolDef = {
  name: 'shopify_list_products',
  description:
    'List products from the connected Shopify store. Returns product title, id, type, vendor, price, image. Supports pagination via page_info token. Use this to enumerate the merchant\'s catalog before structuring or modification.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Max products per page, 1–250 (default 50).' },
      status: { type: 'string', enum: ['active', 'archived', 'draft'], description: 'Filter by status.' },
      page_info: { type: 'string', description: 'Pagination cursor from a previous response.' },
    },
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const { products, nextPageInfo } = await listProducts({
        limit: input.limit as number | undefined,
        status: input.status as 'active' | 'archived' | 'draft' | undefined,
        pageInfo: input.page_info as string | undefined,
      })
      if (products.length === 0) return { output: 'No products found.' }
      const lines = products.map((p, i) => {
        const firstVar = p.variants?.[0]
        const price = firstVar?.price ? `$${firstVar.price}` : '—'
        const img = p.image?.src ? ' 🖼' : ''
        return `${i + 1}. [${p.id}] ${p.title} · ${p.product_type ?? '—'} · ${p.vendor ?? '—'} · ${price}${img}`
      })
      const paging = nextPageInfo ? `\n\nNext page: page_info=${nextPageInfo}` : ''
      return { output: `${products.length} products:\n${lines.join('\n')}${paging}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const ShopifyGetProductTool: ToolDef = {
  name: 'shopify_get_product',
  description: 'Fetch a single Shopify product\'s full details (description, variants, images, tags).',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Shopify product numeric id.' },
    },
    required: ['id'],
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const product = await getProduct(input.id as string)
      return { output: JSON.stringify(product, null, 2) }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const ShopifyUpdateProductTool: ToolDef = {
  name: 'shopify_update_product',
  description:
    'Update an existing Shopify product. Supports editing title, body_html (description), tags (comma-separated string), product_type, vendor, and status. This is destructive — confirm with the user before calling unless they explicitly authorized a bulk edit.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      body_html: { type: 'string', description: 'Full HTML description (safe subset).' },
      tags: { type: 'string', description: 'Comma-separated list of tags — replaces existing tags.' },
      product_type: { type: 'string' },
      vendor: { type: 'string' },
      status: { type: 'string', enum: ['active', 'archived', 'draft'] },
    },
    required: ['id'],
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const { id, ...patch } = input as { id: string } & Record<string, unknown>
      const cleaned = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
      if (Object.keys(cleaned).length === 0) return { error: 'No fields to update were provided.' }
      const updated = await updateProduct(id, cleaned)
      return { output: `Updated product ${updated.id} — ${updated.title}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const ShopifyGetOrdersTool: ToolDef = {
  name: 'shopify_get_orders',
  description: 'Fetch recent Shopify orders. Use for attribution analysis, sales reporting, or customer support research. Returns up to 250 orders per call.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number' },
      status: { type: 'string', enum: ['any', 'open', 'closed', 'cancelled'] },
      created_at_min: { type: 'string', description: 'ISO 8601 timestamp — only orders created on/after this.' },
    },
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const { orders } = await getOrders({
        limit: input.limit as number | undefined,
        status: input.status as 'any' | 'open' | 'closed' | 'cancelled' | undefined,
        createdAtMin: input.created_at_min as string | undefined,
      })
      if (orders.length === 0) return { output: 'No orders in the given window.' }
      const lines = orders.map((o, i) => {
        const total = (o.total_price as string) ?? '—'
        const created = (o.created_at as string) ?? ''
        const name = (o.name as string) ?? `#${o.id}`
        const fulfilled = o.fulfillment_status ?? 'unfulfilled'
        return `${i + 1}. ${name} · $${total} · ${created} · ${fulfilled}`
      })
      return { output: `${orders.length} orders:\n${lines.join('\n')}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}

export const ShopifyGetInventoryTool: ToolDef = {
  name: 'shopify_get_inventory',
  description: 'Fetch inventory levels across Shopify locations. Use for low-stock alerts, restocking decisions, or reconciliation.',
  inputSchema: {
    type: 'object',
    properties: {
      location_ids: { type: 'array', items: { type: 'number' }, description: 'Filter by location ids.' },
    },
  },
  async call(input): Promise<ToolResult> {
    const guard = await assertConnected(); if (guard) return guard
    try {
      const { inventory_levels } = await getInventoryLevels(input.location_ids as number[] | undefined)
      if (inventory_levels.length === 0) return { output: 'No inventory levels found.' }
      return { output: `${inventory_levels.length} inventory levels:\n${JSON.stringify(inventory_levels.slice(0, 50), null, 2)}` }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  },
}
