// Google Merchant Feed — XML (RSS 2.0 with the `g:` Google namespace).
// Docs: https://support.google.com/merchants/answer/7052112
//
// Google accepts CSV too but XML is more expressive and is what Content API
// consumers expect. Using RSS 2.0 keeps the feed hostable as a plain static file.

import type { FeedRow } from './builder'

export interface GoogleFeedMeta {
  title: string
  link: string
  description: string
}

export function buildGoogleXml(rows: FeedRow[], meta: GoogleFeedMeta): string {
  const items = rows.map(rowToXml).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${xml(meta.title)}</title>
<link>${xml(meta.link)}</link>
<description>${xml(meta.description)}</description>
${items}
</channel>
</rss>
`
}

function rowToXml(r: FeedRow): string {
  const parts: string[] = []
  const emit = (tag: string, value: string | undefined, asCdata = false): void => {
    if (!value) return
    parts.push(asCdata ? `<g:${tag}><![CDATA[${value}]]></g:${tag}>` : `<g:${tag}>${xml(value)}</g:${tag}>`)
  }

  emit('id', r.oneId)
  emit('title', r.title, true)
  emit('description', r.description, true)
  emit('link', r.link)
  emit('image_link', r.imageLink)
  for (const extra of r.additionalImageLinks.slice(0, 10)) {
    parts.push(`<g:additional_image_link>${xml(extra)}</g:additional_image_link>`)
  }
  emit('availability', r.availability.replace(' ', '_')) // Google uses in_stock / out_of_stock
  emit('condition', r.condition)
  if (r.price) emit('price', `${r.price.amount.toFixed(2)} ${r.price.currency}`)
  if (r.salePrice) emit('sale_price', `${r.salePrice.amount.toFixed(2)} ${r.salePrice.currency}`)
  emit('brand', r.brand)
  emit('google_product_category', r.category)
  emit('product_type', r.productType)
  emit('item_group_id', r.itemGroupId)
  emit('gtin', r.gtin)
  emit('mpn', r.mpn)
  emit('color', r.color)
  emit('size', r.size)
  emit('material', r.material)

  return `<item>\n${parts.join('\n')}\n</item>`
}

function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
