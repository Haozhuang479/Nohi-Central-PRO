// Layer 1 — Ingestion
//
// Role: pull raw merchant data from external systems into the local main process,
// where Layer 2 can structure it and Layer 3 can store it as OneID records.
//
// Scope today:
//   - Shopify connector + 5 tools (token-based auth via Custom App)
//   - Google Drive connector + 3 tools (OAuth 2.0 Loopback with PKCE)
//   - File dialogs (local PDFs, images, CSVs) via the generic `dialog:open-file` IPC
//
// Scope later (P1):
//   - ERP/OMS/PIM (NetSuite, Brightpearl, Skubana)
//   - CRM/analytics (Klaviyo, Postscript, GA4)
//   - Figma (design assets → OneID media)
//
// Adding a new connector here is now ~30 LOC thanks to connectors/base.ts.

export {
  connectShopify,
  disconnectShopify,
  getShopifyCreds,
  shopifyProductToPartial,
  listProducts as shopifyListProducts,
  getProduct as shopifyGetProduct,
  updateProduct as shopifyUpdateProduct,
  getOrders as shopifyGetOrders,
  getInventoryLevels as shopifyGetInventoryLevels,
} from '../connectors/shopify'

export {
  connectGDrive,
  disconnectGDrive,
  getStatus as gdriveStatus,
  searchFiles as gdriveSearchFiles,
  listFolder as gdriveListFolder,
  readFile as gdriveReadFile,
} from '../connectors/gdrive'

export {
  ShopifyListProductsTool,
  ShopifyGetProductTool,
  ShopifyUpdateProductTool,
  ShopifyGetOrdersTool,
  ShopifyGetInventoryTool,
} from '../tools/shopify'

export {
  GDriveSearchTool,
  GDriveListFolderTool,
  GDriveReadFileTool,
} from '../tools/gdrive'

import { ShopifyListProductsTool, ShopifyGetProductTool, ShopifyUpdateProductTool, ShopifyGetOrdersTool, ShopifyGetInventoryTool } from '../tools/shopify'
import { GDriveSearchTool, GDriveListFolderTool, GDriveReadFileTool } from '../tools/gdrive'
import type { ToolDef } from '../types'

/** All Layer 1 agent tools. Consumed by ALL_TOOLS in tools/index.ts. */
export const LAYER1_TOOLS: ToolDef[] = [
  ShopifyListProductsTool,
  ShopifyGetProductTool,
  ShopifyUpdateProductTool,
  ShopifyGetOrdersTool,
  ShopifyGetInventoryTool,
  GDriveSearchTool,
  GDriveListFolderTool,
  GDriveReadFileTool,
]
