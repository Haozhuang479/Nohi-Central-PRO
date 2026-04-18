// Layer 3 — Agentic Catalog
//
// Role: the canonical structured, semantic product universe. Every product has
// a OneID validated against the Nohi Protocol schema. Backed by a local JSON
// cache at ~/.nohi/catalog/ and a remote API (configurable; currently the dev
// Cloud Run endpoint).
//
// Scope today:
//   - OneID schema + Nohi Protocol v0.1.0 validator + readiness score
//   - 5 agent tools: search, get, upsert, diff, validate
//   - Local snapshot cache (for diff detection + offline browsing)
//   - Shared between agent (via tools) and seller UI (via catalog:search IPC)
//
// Scope later (P1):
//   - Embeddings (currently server-side only)
//   - Online learning / ranking personalization
//   - Nohi Protocol v0.2 with Layer 4 attribution fields (UTM, channelOverrides, orderLinks)

export {
  OneIdProductSchema,
  PartialProductSchema,
  NOHI_PROTOCOL_VERSION,
  validateProduct,
  catalogReadinessScore,
  checksumProduct,
  type OneIdProduct,
  type PartialProduct,
  type ValidationIssue,
} from '../catalog/protocol'

export {
  resolveConfig as resolveCatalogConfig,
  searchRemote as catalogSearchRemote,
  upsertRemote as catalogUpsertRemote,
  getRemote as catalogGetRemote,
  upsertProduct as catalogUpsert,
  getProduct as catalogGet,
  diffProduct as catalogDiff,
  listCached as catalogListCached,
  type CatalogConfig,
  type SearchHit,
} from '../catalog/client'

export {
  CatalogSearchTool,
  CatalogGetProductTool,
  CatalogUpsertProductTool,
  CatalogDiffTool,
  CatalogValidateProtocolTool,
} from '../tools/catalog'

import {
  CatalogSearchTool,
  CatalogGetProductTool,
  CatalogUpsertProductTool,
  CatalogDiffTool,
  CatalogValidateProtocolTool,
} from '../tools/catalog'
import type { ToolDef } from '../types'

export const LAYER3_TOOLS: ToolDef[] = [
  CatalogSearchTool,
  CatalogGetProductTool,
  CatalogUpsertProductTool,
  CatalogDiffTool,
  CatalogValidateProtocolTool,
]
