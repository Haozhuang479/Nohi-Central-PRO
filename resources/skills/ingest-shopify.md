---
name: ingest-shopify
description: Connect a Shopify store and import the product catalog into the Agentic Catalog as OneID records
trigger: "ingest shopify|import shopify|sync shopify|connect shopify|shopify products|shopify 导入|拉 shopify"
---

The user wants to ingest their Shopify store into the Agentic Catalog. Here is the canonical workflow.

## 1. Check connection

Call `shopify_list_products` with `limit: 1` to verify the connection works. If it returns a "not connected" error, tell the user:

> To connect Shopify, go to Settings → Connectors → Shopify. You'll need to paste an Admin API access token. See: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/admin-api-access-tokens — create a Custom App in your Shopify admin, enable the scopes you want (at minimum `read_products`, `read_orders`, `read_inventory`; add `write_products` if you want Nohi to make edits), and copy the Admin API access token.

Then **stop**. Don't retry until the user confirms they've connected.

## 2. Enumerate products

Paginate through Shopify products with `shopify_list_products`. Use `limit: 250` and follow the returned `page_info` token until exhausted. Keep a running count; report every 100 products.

## 3. Convert + upsert into the catalog

For each Shopify product:
- Call `shopify_get_product` to fetch full details (variants, images, tags, HTML description)
- Construct a OneID product record (the connector's `shopifyProductToPartial` helper, described in the Shopify connector, is the canonical mapping — mirror its shape):
  - `oneId`: `shopify-<shop>-<id>`
  - `merchantId`: from settings
  - `title`, `handle`, `descriptionHtml`, `description` (stripped text), `vendor`, `brand`, `productType`, `category`, `tags`, `media[]`, `featuredImage`, `price`, `variants[]`, `totalInventory`
  - `sources: [{ system: 'shopify', id, url, ingestedAt: now }]`
- Validate with `catalog_validate_protocol`. If there are **errors**, skip and record; if there are **warnings**, upsert anyway.
- Call `catalog_upsert_product`

For >20 products, prefer `bulk_apply` with a prompt template like:

> Fetch Shopify product `{{item}}`, convert to a OneID record, validate with `catalog_validate_protocol`, then upsert with `catalog_upsert_product`. Reply with one line: `<oneId> · readiness=<score>`.

Pass `concurrency: 3` to balance speed and rate limits.

## 4. Report

Summarize:
- How many Shopify products total
- How many upserted successfully
- How many failed (list top 5 with reasons)
- Average readiness score
- A list of products below 40/100 (these need enrichment — suggest running the `complete-product` skill next)

## Common issues

- **403 from Shopify** → token missing a scope. Ask user to add `read_products` (and re-issue the token).
- **Rate limit** → reduce `bulk_apply` concurrency to 2.
- **Very large catalogs (>10k)** → chunk by `status: 'active'` first, then `status: 'archived'` in a separate run.
