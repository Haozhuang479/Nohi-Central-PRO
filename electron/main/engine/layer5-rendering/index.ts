// Layer 5 — Product Card / Human Interaction
//
// Phase 6 (v2.5): CardViewModel + preview_product_card tool ship live.
// The tool returns structured data; actual visual components live in
// src/components/product-cards/ (React, consumed by the Analytics + Storefront pages).

export { buildCardViewModel, type CardViewModel } from './card-viewmodel'
export { PreviewProductCardTool } from './tools'

import { PreviewProductCardTool } from './tools'
import type { ToolDef } from '../types'

export const LAYER5_TOOLS: ToolDef[] = [PreviewProductCardTool]
