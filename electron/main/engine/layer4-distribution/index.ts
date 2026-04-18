// Layer 4 — Protocol & Distribution
//
// Phase 4 (v2.3): attribution infrastructure + schema + placeholder distribution
// tools are live. Real feed generators arrive in Phase 6.
//
// Architecture:
//   attribution/       — NohiOrder type, Shopify ingest, summarize(), analyze tool (REAL)
//   feed/              — Meta / Google / Reddit / ACP / UCP feed generators (STUBS)
//   native/            — Nohi Skill bundle export + MCP server registration (STUBS)

export {
  NohiOrderSchema,
  ingestShopifyOrders,
  listOrders,
  summarize,
  type NohiOrder,
  type AttributionSummary,
  type OrderFilter,
} from './attribution/orders'

export { IngestOrdersTool, AnalyzeAttributionTool } from './attribution/tools'
export {
  DistributeMetaFeedTool,
  DistributeGoogleMerchantTool,
  DistributeRedditDpaTool,
  DistributeAcpTool,
  DistributeUcpTool,
} from './feed/tools'
export { NohiSkillExportTool, NohiMcpRegisterTool } from './native/tools'

import { IngestOrdersTool, AnalyzeAttributionTool } from './attribution/tools'
import {
  DistributeMetaFeedTool,
  DistributeGoogleMerchantTool,
  DistributeRedditDpaTool,
  DistributeAcpTool,
  DistributeUcpTool,
} from './feed/tools'
import { NohiSkillExportTool, NohiMcpRegisterTool } from './native/tools'
import type { ToolDef } from '../types'

export const LAYER4_TOOLS: ToolDef[] = [
  // Attribution — real implementations
  IngestOrdersTool,
  AnalyzeAttributionTool,
  // Distribution — stubs pending Phase 6
  DistributeMetaFeedTool,
  DistributeGoogleMerchantTool,
  DistributeRedditDpaTool,
  DistributeAcpTool,
  DistributeUcpTool,
  // Native Nohi channels — stubs pending Phase 6
  NohiSkillExportTool,
  NohiMcpRegisterTool,
]
