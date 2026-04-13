import { BashTool } from './bash'
import { FileReadTool } from './fileRead'
import { FileWriteTool } from './fileWrite'
import { FileEditTool } from './fileEdit'
import { GlobTool } from './glob'
import { GrepTool } from './grep'
import { WebFetchTool } from './webFetch'
import { WebSearchTool } from './webSearch'
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
]

export { BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool, WebFetchTool, WebSearchTool }
