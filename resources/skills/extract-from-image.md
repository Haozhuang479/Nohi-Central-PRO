---
name: extract-from-image
description: Use vision to extract structured product attributes, OCR text, or descriptions from product images (local or from Drive)
trigger: "extract image|vision|ocr|product photo|analyze image|image attributes|从图片提取|识别图片"
---

Use `extract_from_image` to pull structured data out of product photos. Three canonical modes:

## Mode A: Product attribute extraction (most common)

Call with `task: 'product_attributes'`. The vision model returns **JSON only** with these keys:
- `title`, `category`, `productType`, `color`, `material`, `size`, `dimensions`, `style`
- `tags`, `keywords`
- `description` (2-3 sentences)
- `targetAudience`, `useCases`

Parse the JSON. If fields are `null`, don't fabricate — leave them empty on the OneID record.

Typical flow: user has a product with no attributes filled in, only a photo.
1. Call `extract_from_image` on the featured image with `task: 'product_attributes'`
2. Parse JSON response
3. Merge into the product's OneID partial (existing fields win over inferred ones unless the user said "overwrite")
4. Validate with `catalog_validate_protocol`, then `catalog_upsert_product`

## Mode B: OCR only

Call with `task: 'ocr'` when you need text from a label, tag, or document photo — e.g. the user wants to read a price tag, ingredient list, or spec sheet.

## Mode C: Free-form description

Call with `task: 'describe'` for a 2-3 sentence marketing caption. Good for product detail page hero alt text.

Or `task: 'custom'` + your own `prompt` when none of the above fit.

## Batch workflow

For "extract attributes from images for every product missing them" → use `bulk_apply`:

- `items`: list of OneIDs that need enrichment
- `prompt_template`:
  > Fetch product `{{item}}` with `catalog_get_product`. For each image in `media`, call `extract_from_image` with `task: 'product_attributes'`. Merge the inferred fields (don't overwrite existing). Validate, then `catalog_upsert_product`. Reply: `{{item}} · readiness before → after`.
- `concurrency: 2` (vision is slow + expensive; keep it low)

## Cost note

Vision costs ~0.01-0.03 USD per image on gpt-4o-mini. For 1000 products with 1 image each, expect ~$15-30. Warn the user before kicking off large batches.

## Fallbacks

- If OpenAI key is not set → tell the user to add it in Settings; skip processing
- If the image URL is a CDN that requires auth → download locally first, then pass the local path
