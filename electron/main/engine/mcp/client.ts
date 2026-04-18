// MCP Client — connects to external MCP servers (Shopify, databases, etc.)
// Adapted from Claude Code src/services/mcp/client.ts (simplified for Electron IPC)

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { McpServerConfig, ToolDef, ToolResult, ToolCallOpts } from '../types'
import { log, logError } from '../lib/logger'

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
  private lastErrors = new Map<string, string>()
  private serverNames = new Map<string, string>()

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
      this.serverNames.set(config.id, config.name)
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
        this.lastErrors.delete(config.id)
        log('info', `[mcp] Connected to ${config.name}`)
      } catch (err) {
        this.statuses.set(config.id, 'error')
        const e = err as { message?: string; code?: string }
        this.lastErrors.set(config.id, e.message ?? String(err))
        logError(err, `[mcp] Failed to connect to ${config.name}`)
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
        logError(err, `[mcp] Failed to list tools for ${config.name}`)
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
        if (!client) {
          const lastErr = this.lastErrors.get(meta.serverId)
          const lastErrText = lastErr ? ` (last error: ${lastErr})` : ''
          return {
            error: `MCP server "${meta.serverName}" is not connected${lastErrText}. Open Settings → MCP and reconnect, or check the server's command/env vars.`,
          }
        }
        try {
          const result = await client.callTool({ name: meta.toolName, arguments: input })
          const content = result.content as Array<{ type: string; text?: string }>
          const text = content
            .filter((c) => c.type === 'text')
            .map((c) => c.text ?? '')
            .join('\n')
          if (result.isError) {
            // Tool itself reported an error — surface verbatim with server context.
            return { error: `[${meta.serverName} → ${meta.toolName}] ${text}` }
          }
          return { output: text }
        } catch (err: unknown) {
          const e = err as { message?: string; code?: string | number }
          // Mark the server as errored so subsequent calls give the disconnect hint.
          this.lastErrors.set(meta.serverId, e.message ?? 'unknown')
          this.statuses.set(meta.serverId, 'error')
          logError(err, `[mcp] tool call failed: ${meta.serverName}.${meta.toolName}`)
          const codeHint = e.code ? ` (code ${e.code})` : ''
          return {
            error: `MCP tool "${meta.serverName}.${meta.toolName}" failed${codeHint}: ${e.message ?? 'unknown error'}. The server may have crashed — try Settings → MCP → Reconnect.`,
          }
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
