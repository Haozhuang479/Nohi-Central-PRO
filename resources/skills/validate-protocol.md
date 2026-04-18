---
name: validate-protocol
description: Check products in the Agentic Catalog against the current Nohi Protocol and report structural errors, quality warnings, and readiness scores
trigger: "validate protocol|check catalog|protocol validate|readiness|catalog health|协议校验|catalog 检查"
---

Use `catalog_validate_protocol` to inspect how well a product conforms to the Nohi Protocol (the agent-native product schema).

## Single product

If the user asks "is product X ready for distribution?":
1. `catalog_get_product` with the OneID
2. `catalog_validate_protocol` on the product
3. Report the score + errors + warnings
4. For each warning, suggest a fix (e.g. "No metaDescription — run `seo-optimizer` skill" or "No featured image — upload one via Shopify or `gdrive_read_file`")

## Whole catalog audit

User says "audit the whole catalog" or "what's my readiness?":

1. Enumerate products (`catalog_search` with broad queries, or list cached products — for now use `catalog_search "*"` with high limit)
2. For each, validate. Use `bulk_apply`:

```
items: [oneId1, oneId2, ...]
prompt_template:
  Fetch {{item}} with catalog_get_product. Call catalog_validate_protocol on it.
  Reply with exactly: "{{item}} | <score> | <errorCount> | <topMissingField>"
concurrency: 4
```

3. Aggregate the replies. Report:
   - Distribution of readiness scores (histogram: 0-40 / 40-70 / 70-100)
   - Top 5 most common missing fields
   - Count of products with structural errors (unusable)
   - 5 specific products to fix first (lowest score, highest impact — prefer products with inventory > 0)

## Interpretation

- **Structural errors** → the product can't be upserted; someone must fix it manually or via `complete-product`
- **Quality warnings** → product is usable but will underperform on agent surfaces (ChatGPT card, Meta DPA)
- **Readiness score**:
  - 80–100: production-ready
  - 60–80: acceptable, would benefit from enrichment
  - 40–60: distributable but underperforming
  - 0–40: needs `complete-product` or manual cleanup before distribution

## Cost

Validation is free (pure local logic + schema check). Safe to run against the full catalog.
