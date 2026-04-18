// Layer 5 — Product Card / Human Interaction
//
// Role: render an OneID product as it will appear on each destination surface
// (ChatGPT product card, Meta DPA, Google Shopping tile, Nohi Conversational
// Storefront). Let merchants preview side-by-side before publishing.
//
// Scope today: **none shipped yet.** This module is a placeholder.
//
// Planned (P1):
//   - CardViewModel (subset of OneID safe for 3rd-party rendering)
//   - React components: ChatGPTProductCard, MetaDPACard, GoogleShoppingCard,
//     StorefrontCard
//   - preview_product_card tool — renders and returns a data URL or file path
//     (rendered in main process via a headless offscreen BrowserWindow)
//   - preview-product-card skill

import type { ToolDef } from '../types'

export const LAYER5_TOOLS: ToolDef[] = []
