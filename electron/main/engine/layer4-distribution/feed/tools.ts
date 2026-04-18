// Distribution tools — stubs for Phase 4.
//
// These register as agent tools so the model can plan around them and the seller
// UI can discover which channels exist. Each returns a "not yet implemented"
// ToolResult describing what it WILL do — enough detail that the agent's plan
// correctly sequences catalog_validate_protocol → generate_feed → push without
// needing to know implementation details.
//
// Real implementations land in Phase 6. The schemas and file paths below are
// the stable interface contract.

import type { ToolDef, ToolResult } from '../../types'

const PHASE_6_NOTE =
  'This tool is a placeholder — the feed generator is scheduled for Phase 6. ' +
  'The schema and expected behavior are stable. For now, use catalog_validate_protocol ' +
  'to confirm readiness and memory_write to note which products the merchant wants distributed.'

export const DistributeMetaFeedTool: ToolDef = {
  name: 'distribute_meta_feed',
  description:
    'Generate a Meta (Facebook/Instagram) catalog feed from the Agentic Catalog. Applies channel overrides for `meta-feed` and stamps UTM = nohi for owned-channel attribution. Returns a local CSV/XML path the merchant can upload to Meta Commerce Manager (or a URL once remote hosting lands).',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'OneIDs to include. Omit to include the entire merchant catalog.',
      },
      utm_campaign: { type: 'string', description: 'Campaign tag baked into product URLs.' },
      output_format: { type: 'string', enum: ['csv', 'xml'], description: 'Meta accepts both. Default: csv.' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: `distribute_meta_feed — not yet implemented.\n\n${PHASE_6_NOTE}` }
  },
}

export const DistributeGoogleMerchantTool: ToolDef = {
  name: 'distribute_google_merchant',
  description:
    'Push the Agentic Catalog to Google Merchant Center via the Content API. Applies channel overrides for `google-merchant` and handles GTIN/MPN/availability mapping.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      utm_campaign: { type: 'string' },
      dry_run: { type: 'boolean', description: 'Validate the payload without hitting the API.' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: `distribute_google_merchant — not yet implemented.\n\n${PHASE_6_NOTE}` }
  },
}

export const DistributeRedditDpaTool: ToolDef = {
  name: 'distribute_reddit_dpa',
  description:
    'Build a Reddit Dynamic Product Ads catalog feed from the Agentic Catalog. Reddit DPA expects a TSV/CSV with specific headers; this tool emits the file in Reddit\'s format.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      utm_campaign: { type: 'string' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: `distribute_reddit_dpa — not yet implemented.\n\n${PHASE_6_NOTE}` }
  },
}

export const DistributeAcpTool: ToolDef = {
  name: 'distribute_acp',
  description:
    'Publish products via the Agentic Commerce Protocol (ACP). ACP is an organic, spec-defined protocol — no Nohi attribution. Awaiting public spec finalization.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      endpoint: { type: 'string', description: 'ACP endpoint URL.' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: 'distribute_acp — awaiting ACP spec finalization. Tool stub registered so the agent can plan around it.' }
  },
}

export const DistributeUcpTool: ToolDef = {
  name: 'distribute_ucp',
  description:
    'Publish products via the Universal Commerce Protocol (UCP). Organic channel, no Nohi attribution. Awaiting public spec finalization.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: { type: 'array', items: { type: 'string' } },
      endpoint: { type: 'string' },
    },
  },
  async call(): Promise<ToolResult> {
    return { output: 'distribute_ucp — awaiting UCP spec finalization. Tool stub registered so the agent can plan around it.' }
  },
}
