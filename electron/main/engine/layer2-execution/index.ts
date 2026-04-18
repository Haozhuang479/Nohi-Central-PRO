// Layer 2 — Execution & Structuring
//
// Role: transform raw Layer 1 data into structured Layer 3 records. Multimodal
// extraction, image generation, brand-voice rewriting, bulk orchestration.
//
// Scope today:
//   - Vision-based attribute extraction from product images (gpt-4o-mini)
//   - PDF text extraction (pdfjs-dist)
//   - Image generation + editing (OpenAI Images API)
//   - Bulk operation primitive — spawns subagents with bounded concurrency + retry
//
// Scope later (P1):
//   - Brand-voice service (compiled profile from memory + examples)
//   - Video/audio extraction (gpt-4o audio, whisper over long files)
//   - Attribute completion service (agent + cache of merchant's own filled patterns)

export { ExtractFromImageTool, ExtractFromPdfTool } from '../tools/extract'
export { ImageGenerateTool, ImageEditTool } from '../tools/imageGenerate'
export { BulkApplyTool, registerBulkRunner } from '../tools/bulkApply'

import { ExtractFromImageTool, ExtractFromPdfTool } from '../tools/extract'
import { ImageGenerateTool, ImageEditTool } from '../tools/imageGenerate'
import { BulkApplyTool } from '../tools/bulkApply'
import type { ToolDef } from '../types'

export const LAYER2_TOOLS: ToolDef[] = [
  ExtractFromImageTool,
  ExtractFromPdfTool,
  ImageGenerateTool,
  ImageEditTool,
  BulkApplyTool,
]
