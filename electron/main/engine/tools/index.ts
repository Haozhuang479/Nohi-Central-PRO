// Agent tool registry.
//
// Since Phase 2, tools are grouped by 6-layer-architecture position and composed here.
// Adding a tool in a layer? Register it in that layer's `index.ts`, not here.

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
import { FirecrawlScrapeTool, FirecrawlSearchTool, FirecrawlCrawlTool } from './firecrawl'
import { TodoWriteTool } from './todoWrite'
import { TaskTool } from './task'
import { NotebookEditTool } from './notebookEdit'

// Layer-organized tool sets
import { LAYER1_TOOLS } from '../layer1-ingestion'
import { LAYER2_TOOLS } from '../layer2-execution'
import { LAYER3_TOOLS } from '../layer3-catalog'
import { LAYER4_TOOLS } from '../layer4-distribution'
import { LAYER5_TOOLS } from '../layer5-rendering'

import type { ToolDef } from '../types'

// Core agent primitives — not tied to any layer, used by all.
const CORE_TOOLS: ToolDef[] = [
  // Filesystem + shell
  BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool,
  NotebookEditTool,
  // Web
  WebFetchTool, WebSearchTool, FirecrawlScrapeTool, FirecrawlSearchTool, FirecrawlCrawlTool, DeepResearchTool,
  // Memory
  MemoryReadTool, MemoryWriteTool, MemoryDeleteTool,
  // Agent primitives (structured planning, subagents)
  TodoWriteTool, TaskTool,
  // Legacy — superseded by catalog_* but kept for backward compat during transition
  ProductSearchTool, ProductUploadTool,
]

export const ALL_TOOLS: ToolDef[] = [
  ...CORE_TOOLS,
  ...LAYER1_TOOLS,
  ...LAYER2_TOOLS,
  ...LAYER3_TOOLS,
  ...LAYER4_TOOLS,
  ...LAYER5_TOOLS,
]

// Back-compat named exports for anywhere that still imports individual tools directly.
export { BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool, WebFetchTool, WebSearchTool, ProductSearchTool, ProductUploadTool }
