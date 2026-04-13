// MCP Client — connects to external MCP servers (Shopify, databases, etc.)
// Adapted from Claude Code src/services/mcp/client.ts (simplified for Electron IPC)

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { McpServerConfig, ToolDef, ToolResult, ToolCallOpts } from '../types'

interface McpToolMeta {
  serverName: string
  serverId: string
  toolName: string
  description: string
  inputSchema: Record<string, unknown>
}

export class McpClientManager {
  private clients = new Map<string, Client>()
  private toolMetas: McpToolMeta[] = []
  private statuses = new Map<string, 'connected' | 'disconnected' | 'error'>()

  async connect(configs: McpServerConfig[]): Promise<void> {
    // Disconnect any removed servers
    for (const [id, client] of this.clients) {
      if (!configs.find((c) => c.id === id && c.enabled)) {
        await client.close().catch(() => {})
        this.clients.delete(id)
      }
    }

    // Connect new/updated enabled servers
    for (const config of configs.filter((c) => c.enabled)) {
      if (this.clients.has(config.id)) continue
      try {
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
        })
        const client = new Client({ name: 'nohi-central-pro', version: '1.0.0' }, { capabilities: {} })
        await client.connect(transport)
        this.clients.set(config.id, client)
        this.statuses.set(config.id, 'connected')
        console.log(`[MCP] Connected to ${config.name}`)
      } catch (err) {
        this.statuses.set(config.id, 'error')
        console.error(`[MCP] Failed to connect to ${config.name}:`, err)
      }
    }

    await this.refreshToolMetas(configs)
  }

  private async refreshToolMetas(configs: McpServerConfig[]): Promise<void> {
    this.toolMetas = []
    for (const [id, client] of this.clients) {
      const config = configs.find((c) => c.id === id)
      if (!config) continue
      try {
        const { tools } = await client.listTools()
        for (const tool of tools) {
          this.toolMetas.push({
            serverName: config.name,
            serverId: id,
            toolName: tool.name,
            description: tool.description ?? '',
            inputSchema: tool.inputSchema as Record<string, unknown>,
          })
        }
      } catch (err) {
        console.error(`[MCP] Failed to list tools for ${config.name}:`, err)
      }
    }
  }

  getToolDefs(): ToolDef[] {
    return this.toolMetas.map((meta) => ({
      name: `mcp__${meta.serverName.replace(/\s+/g, '_')}__${meta.toolName}`,
      description: `[${meta.serverName}] ${meta.description}`,
      inputSchema: meta.inputSchema,

      call: async (input: Record<string, unknown>, _opts: ToolCallOpts): Promise<ToolResult> => {
        const client = this.clients.get(meta.serverId)
        if (!client) return { error: `MCP server "${meta.serverName}" not connected` }
        try {
          const result = await client.callTool({ name: meta.toolName, arguments: input })
          const content = result.content as Array<{ type: string; text?: string }>
          const text = content
            .filter((c) => c.type === 'text')
            .map((c) => c.text ?? '')
            .join('\n')
          return result.isError ? { error: text } : { output: text }
        } catch (err: unknown) {
          const e = err as { message?: string }
          return { error: e.message ?? 'MCP tool call failed' }
        }
      },
    }))
  }

  getStatuses(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [id, status] of this.statuses) result[id] = status
    return result
  }

  getServerTools(serverId: string): string[] {
    return this.toolMetas
      .filter((m) => m.serverId === serverId)
      .map((m) => m.toolName)
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close().catch(() => {})
    }
    this.clients.clear()
    this.toolMetas = []
    this.statuses.clear()
  }
}

export const mcpManager = new McpClientManager()
