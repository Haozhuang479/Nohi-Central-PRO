import { BashTool } from './bash'
import { FileReadTool } from './fileRead'
import { FileWriteTool } from './fileWrite'
import { FileEditTool } from './fileEdit'
import { GlobTool } from './glob'
import { GrepTool } from './grep'
import { WebFetchTool } from './webFetch'
import { WebSearchTool } from './webSearch'
import { ProductSearchTool, ProductUploadTool } from './productSearch'
import { MemoryReadTool, MemoryWriteTool, MemoryDeleteTool } from './memory'
import { DeepResearchTool } from './deepResearch'
import { ImageGenerateTool, ImageEditTool } from './imageGenerate'
import { FirecrawlScrapeTool, FirecrawlSearchTool, FirecrawlCrawlTool } from './firecrawl'
import { TodoWriteTool } from './todoWrite'
import { TaskTool } from './task'
import { NotebookEditTool } from './notebookEdit'
import {
  ShopifyListProductsTool,
  ShopifyGetProductTool,
  ShopifyUpdateProductTool,
  ShopifyGetOrdersTool,
  ShopifyGetInventoryTool,
} from './shopify'
import { GDriveSearchTool, GDriveListFolderTool, GDriveReadFileTool } from './gdrive'
import { ExtractFromImageTool, ExtractFromPdfTool } from './extract'
import {
  CatalogSearchTool,
  CatalogGetProductTool,
  CatalogUpsertProductTool,
  CatalogDiffTool,
  CatalogValidateProtocolTool,
} from './catalog'
import { BulkApplyTool } from './bulkApply'
import type { ToolDef } from '../types'

export const ALL_TOOLS: ToolDef[] = [
  // Filesystem & shell
  BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool,
  // Web
  WebFetchTool, WebSearchTool, FirecrawlScrapeTool, FirecrawlSearchTool, FirecrawlCrawlTool, DeepResearchTool,
  // Legacy product tools (superseded by catalog_* but kept for back-compat)
  ProductSearchTool, ProductUploadTool,
  // Memory
  MemoryReadTool, MemoryWriteTool, MemoryDeleteTool,
  // Image
  ImageGenerateTool, ImageEditTool,
  // Agent primitives
  TodoWriteTool, TaskTool, NotebookEditTool,
  // ── Layer 1: ingestion connectors ─────────────────
  ShopifyListProductsTool, ShopifyGetProductTool, ShopifyUpdateProductTool, ShopifyGetOrdersTool, ShopifyGetInventoryTool,
  GDriveSearchTool, GDriveListFolderTool, GDriveReadFileTool,
  // ── Layer 2: multimodal extraction ────────────────
  ExtractFromImageTool, ExtractFromPdfTool,
  // ── Layer 3: Agentic Catalog ──────────────────────
  CatalogSearchTool, CatalogGetProductTool, CatalogUpsertProductTool, CatalogDiffTool, CatalogValidateProtocolTool,
  // ── Bulk operation primitive ──────────────────────
  BulkApplyTool,
]

export { BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool, WebFetchTool, WebSearchTool, ProductSearchTool, ProductUploadTool }
