// Meta Catalog feed — CSV format per the Meta commerce spec.
// Docs: https://developers.facebook.com/docs/commerce-platform/catalog/fields
//
// Minimum required columns: id, title, description, availability, condition,
// price, link, image_link, brand. Everything else optional but helpful.

import type { FeedRow } from './builder'

const HEADERS = [
  'id', 'title', 'description', 'availability', 'condition', 'price',
  'link', 'image_link', 'additional_image_link',
  'brand', 'google_product_category', 'fb_product_category', 'product_type',
  'sale_price', 'item_group_id', 'gtin', 'mpn',
  'color', 'size', 'material',
]

export function buildMetaCsv(rows: FeedRow[]): string {
  const lines = [HEADERS.join(',')]
  for (const r of rows) {
    lines.push([
      csvCell(r.oneId),
      csvCell(r.title),
      csvCell(r.description),
      csvCell(r.availability),
      csvCell(r.condition),
      csvCell(formatPrice(r.price)),
      csvCell(r.link),
      csvCell(r.imageLink ?? ''),
      csvCell(r.additionalImageLinks.slice(0, 10).join(',')),
      csvCell(r.brand ?? ''),
      csvCell(r.category ?? ''),
      csvCell(r.category ?? ''),
      csvCell(r.productType ?? ''),
      csvCell(formatPrice(r.salePrice)),
      csvCell(r.itemGroupId ?? ''),
      csvCell(r.gtin ?? ''),
      csvCell(r.mpn ?? ''),
      csvCell(r.color ?? ''),
      csvCell(r.size ?? ''),
      csvCell(r.material ?? ''),
    ].join(','))
  }
  return lines.join('\n') + '\n'
}

function formatPrice(p?: { amount: number; currency: string }): string {
  if (!p) return ''
  return `${p.amount.toFixed(2)} ${p.currency}`
}

function csvCell(v: string): string {
  const needsQuote = /[",\n\r]/.test(v)
  return needsQuote ? `"${v.replace(/"/g, '""')}"` : v
}
