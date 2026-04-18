// Nohi-native channel tools — Skill bundle export + MCP server registration.
// Stubs for Phase 4; real implementations in Phase 6.

import type { ToolDef, ToolResult, ToolCallOpts } from '../../types'
import { clampNumber, runTool } from '../../tools/_utils'

export const NohiSkillExportTool: ToolDef = {
  name: 'nohi_skill_export',
  description:
    'Generate a Nohi Skill bundle (markdown + manifest) that lets ANY Claude Code / Codex agent shop this merchant\'s catalog. The bundle includes a trigger, a description, and tool definitions for product_search + checkout. Share the resulting directory with customers or agent-native platforms.',
  inputSchema: {
    type: 'object',
    properties: {
      bundle_name: { type: 'string', description: 'Short name, e.g. "acme-catalog".' },
      output_path: { type: 'string', description: 'Local directory to write the bundle into.' },
      limit_products: {
        type: 'number',
        description: 'Cap the number of products baked in (default 500).',
      },
    },
    required: ['bundle_name'],
  },
  async call(input): Promise<ToolResult> {
    return runTool(async () => {
      const name = input.bundle_name as string
      const limit = clampNumber(input.limit_products, { min: 1, max: 5000, default: 500 })
      return {
        output: [
          `nohi_skill_export — not yet implemented.`,
          ``,
          `Planned behavior:`,
          `  1. Query the catalog for up to ${limit} products for this merchantId`,
          `  2. Generate:`,
          `     - ${name}/SKILL.md with YAML frontmatter + usage description`,
          `     - ${name}/products.jsonl (one product per line, OneID-shaped)`,
          `     - ${name}/tools/search.ts (delegates to catalog_search via HTTP)`,
          `     - ${name}/tools/checkout.ts (Shopify checkout URL builder + UTM stamp)`,
          `  3. Return path + install command: \`claude install-skill <path>\``,
          ``,
          `Ship target: Phase 6.`,
        ].join('\n'),
      }
    }, 'nohi_skill_export')
  },
}

export const NohiMcpRegisterTool: ToolDef = {
  name: 'nohi_mcp_register',
  description:
    'Expose this merchant\'s catalog as an MCP server endpoint that any agent (ChatGPT, Claude Desktop, third-party) can connect to. Returns the connection config block the merchant can paste into their consumers.',
  inputSchema: {
    type: 'object',
    properties: {
      public: {
        type: 'boolean',
        description: 'If true, register with the Nohi MCP Registry so other agents can discover it. Default false.',
      },
    },
  },
  async call(_input, _opts: ToolCallOpts): Promise<ToolResult> {
    return {
      output: [
        'nohi_mcp_register — not yet implemented.',
        '',
        'Planned behavior:',
        '  1. Spin up an MCP stdio/streaming server locally that exposes:',
        '     - tool: search_products(query)',
        '     - tool: get_product(oneId)',
        '     - tool: available_inventory(sku)',
        '  2. If public=true, POST registration to the Nohi MCP Registry',
        '  3. Emit a JSON config block for Claude Desktop / ChatGPT agent connection',
        '',
        'Ship target: Phase 6.',
      ].join('\n'),
    }
  },
}
