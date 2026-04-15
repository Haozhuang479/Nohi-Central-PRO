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
import type { ToolDef } from '../types'

export const ALL_TOOLS: ToolDef[] = [
  BashTool,
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  GlobTool,
  GrepTool,
  WebFetchTool,
  WebSearchTool,
  ProductSearchTool,
  ProductUploadTool,
  MemoryReadTool,
  MemoryWriteTool,
  MemoryDeleteTool,
  DeepResearchTool,
  ImageGenerateTool,
  ImageEditTool,
]

export { BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool, WebFetchTool, WebSearchTool, ProductSearchTool, ProductUploadTool }
