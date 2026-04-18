---
name: analyze-attribution
description: Pull recent orders and compute attribution by channel — Nohi-owned vs paid external vs organic vs unattributed
trigger: "attribution|revenue by channel|nohi-attributed|channel performance|归因|channel gmv|sales breakdown"
---

The user wants to see where their revenue came from. Run this when they ask questions like:
- "How much did Nohi drive last month?"
- "Revenue by channel for the past 30 days"
- "Which channel has the best AOV?"

## Flow

1. **Make sure orders are fresh.** Call `ingest_orders` first with `since_days` matching the window the user asked about (cap at 90). This pulls from Shopify and appends to `~/.nohi/orders/`. It's append-only and cheap — don't skip it on the first call in a session, but don't re-run within the same conversation unless the user specifically asks for a refresh.

2. **Run `analyze_attribution`** with the same `since_days`. It returns a markdown table broken down by:
   - **Nohi-owned**: `nohi-skill`, `nohi-storefront`, `nohi-chatgpt-app`, `nohi-mcp` — these are full Nohi attribution (order-level, UTM source = nohi).
   - **Paid external**: `meta-feed`, `google-merchant`, `reddit-dpa`, `tiktok-shop` — Nohi shaped the feed, the 3rd party rendered it. Campaign-level attribution.
   - **Organic protocol**: `acp`, `ucp` — public protocols, no Nohi attribution claimed.
   - **Unattributed**: no UTM or unknown source. Usually direct/type-in or partners not tagged.

3. **Report** the numbers. Highlight:
   - Which kind grew fastest vs the prior period (if data exists)
   - Any channel with AOV >2× average — worth expanding
   - Unattributed share — if > 30%, suggest the merchant add UTM tags to their campaigns

## Caveats

- **Attribution relies on UTMs being set.** If a merchant pushed a Meta feed without `utm_source=meta`, those orders land in `unattributed`. Suggest fixing the feed tagging if you see this.
- **Returns / refunds not deducted** — the data is GMV, not net revenue.
- **Only imports orders the merchant's Shopify returns.** If they fulfill elsewhere, this is partial.
