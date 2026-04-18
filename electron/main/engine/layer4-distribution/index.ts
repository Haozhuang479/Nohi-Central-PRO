// Layer 4 — Protocol & Distribution
//
// Role: push OneID products out to external platforms (Meta, Google Merchant, Reddit,
// ACP, UCP) and Nohi-native channels (Skill bundle, ChatGPT App, Conversational
// Storefront). Tag with UTM / channel metadata. Ingest order webhooks to calculate
// attribution.
//
// Scope today: **none shipped yet.** This module is a placeholder to reserve the
// architectural slot so Phase 4 tool additions land coherently.
//
// Planned tools (P1):
//   - distribute_meta_feed
//   - distribute_google_merchant
//   - distribute_reddit_dpa
//   - distribute_acp (pending spec)
//   - distribute_ucp (pending spec)
//   - nohi_skill_export (generate a Nohi Skill bundle for any agent to shop)
//   - nohi_mcp_register (expose merchant catalog as an MCP endpoint)
//   - analyze_attribution (after order webhooks + UTM model land)
//
// Planned infrastructure:
//   - layer4-distribution/attribution/orders.ts (Shopify order webhook ingestor)
//   - layer4-distribution/attribution/scorer.ts (GMV by channel, AOV, etc.)
//   - layer4-distribution/feed/generator.ts (shared feed builder)
//   - layer4-distribution/feed/adapters/{meta,google,reddit,acp,ucp}.ts

import type { ToolDef } from '../types'

export const LAYER4_TOOLS: ToolDef[] = []
