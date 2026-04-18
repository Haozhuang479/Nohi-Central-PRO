---
name: complete-product
description: Fill missing attributes on a product (or batch of products) using vision, brand context, and existing catalog data
trigger: "complete product|enrich product|fill attributes|missing fields|complete catalog|补全商品|enrich"
---

The canonical "make a half-filled product production-ready" workflow. Layers in this order:

1. **Existing catalog data** — look for similar products already well-filled; reuse category/tags/keywords patterns
2. **Vision** — extract attributes from featured image(s) via `extract_from_image`
3. **Brand context** — pull brand voice, guardrails, target audience from `memory_read` (category=reference, tag containing "brand")
4. **Web research** (last resort) — `firecrawl_scrape` the original product URL if sources include one

## Per-product flow (single item)

1. `catalog_get_product` → get current state + readiness score
2. `catalog_validate_protocol` → identify exactly which fields are missing
3. For each missing field group, apply the cheapest source that can fill it:
   - Missing color/material/size/dimensions → `extract_from_image` with `task: 'product_attributes'`
   - Missing description/summary → compose from existing title + attributes + brand voice
   - Missing metaDescription → truncate summary to 150 chars, keyword-enriched
   - Missing tags/keywords → derive from category + extracted attributes (5–10 tags max)
   - Missing category → map from `productType` if present, otherwise infer from vision
   - Missing targetAudience → extract from brand context memory
4. Merge (don't overwrite existing fields unless they're empty strings)
5. Validate → if errors remain, surface them; if score improved, upsert
6. `catalog_upsert_product`
7. Report old vs new score

## Bulk flow

User: "enrich every product below 60/100 readiness"

1. Audit (run `validate-protocol` skill or direct `bulk_apply`)
2. Filter to items < 60
3. Confirm scope with the user and an estimated cost ($0.01-0.03 per image × image count)
4. `bulk_apply` with:
   - `items`: low-score OneIDs
   - `prompt_template`:
     > Run the `complete-product` skill on `{{item}}`. Reply: `{{item}} · <oldScore> → <newScore>`.
   - `concurrency: 2`
5. Aggregate the report

## Guardrails

- **Never** invent a price. If price is missing, leave it missing — the merchant sets it.
- **Never** invent a SKU, inventory, or URL. These come from source systems.
- **Do** infer style, occasion, use cases, target audience from visuals + context.
- **Do** propagate brand voice. If `brandVoiceTag` is set, use the associated memory profile for tone.
- **Always** call `catalog_validate_protocol` before and after, so the user sees the uplift.
