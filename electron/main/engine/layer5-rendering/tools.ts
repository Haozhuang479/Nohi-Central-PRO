// Product card preview tool.
// Returns a CardViewModel for one or more channels so the renderer can display
// a side-by-side preview (what the product looks like on ChatGPT vs Meta vs
// Storefront). The actual visual rendering lives in React components under
// src/components/product-cards/; this tool just hands back the viewmodel data.

import type { ToolDef, ToolResult, ToolCallOpts } from '../types'
import { castString, castStringArray, runTool } from '../tools/_utils'
import { resolveConfig, getProduct } from '../catalog/client'
import { buildCardViewModel } from './card-viewmodel'
import { ChannelIdSchema } from '../catalog/protocol'

export const PreviewProductCardTool: ToolDef = {
  name: 'preview_product_card',
  description:
    'Preview how a product will render across destination surfaces (ChatGPT card, Meta DPA, Storefront, etc.). Returns one CardViewModel per requested channel — the merchant can compare copy, pricing, and image side-by-side before publishing. Use this before running any `distribute_*` tool so the user can catch channel-specific issues.',
  inputSchema: {
    type: 'object',
    properties: {
      one_id: { type: 'string', description: 'Product OneID to preview.' },
      channels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Channel ids to preview (e.g. ["nohi-storefront", "meta-feed", "google-merchant"]). Defaults to all 3.',
      },
    },
    required: ['one_id'],
  },

  async call(input, opts: ToolCallOpts): Promise<ToolResult> {
    return runTool(async () => {
      const oneId = castString(input.one_id, 'one_id')
      const channels = (input.channels ? castStringArray(input.channels, 'channels') : ['nohi-storefront', 'meta-feed', 'google-merchant'])
        .filter((c) => ChannelIdSchema.safeParse(c).success) as Array<import('../catalog/protocol').ChannelId>

      if (channels.length === 0) return { error: 'No valid channels requested. Use one of: nohi-skill, nohi-storefront, meta-feed, google-merchant, reddit-dpa, tiktok-shop, acp, ucp.' }

      const s = (opts.settings ?? {}) as Record<string, unknown>
      const cfg = resolveConfig({
        catalogApiUrl: s.catalogApiUrl as string | undefined,
        catalogApiToken: s.catalogApiToken as string | undefined,
        merchantId: s.merchantId as string | undefined,
      })
      const { product, source } = await getProduct(cfg, oneId)
      if (!product) return { error: `Product not found: ${oneId}` }

      const previews = channels.map((channelId) => ({
        channelId,
        card: buildCardViewModel(product, channelId),
      }))

      const lines: string[] = []
      lines.push(`# Preview: ${product.title}`)
      lines.push(`Source: ${source}  ·  OneID: ${product.oneId}`)
      lines.push('')
      for (const p of previews) {
        lines.push(`## ${p.channelId}`)
        lines.push(`- Title: ${p.card.title}`)
        if (p.card.subtitle) lines.push(`- Brand: ${p.card.subtitle}`)
        lines.push(`- Price: ${p.card.price ?? '—'}${p.card.comparePrice ? ` ~~${p.card.comparePrice}~~` : ''}`)
        lines.push(`- Image: ${p.card.imageUrl ?? '(none)'}`)
        lines.push(`- Summary: ${p.card.summary.slice(0, 140)}`)
        if (p.card.badges.length > 0) lines.push(`- Badges: ${p.card.badges.join(', ')}`)
        lines.push(`- URL: ${p.card.url}`)
        lines.push('')
      }
      lines.push('```json')
      lines.push(JSON.stringify(previews, null, 2))
      lines.push('```')

      return { output: lines.join('\n') }
    }, 'preview_product_card')
  },
}
