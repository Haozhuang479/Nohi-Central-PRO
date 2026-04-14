import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import type { NohiSettings, McpServerConfig } from '../../../../electron/main/engine/types'

interface McpPageProps {
  settings: NohiSettings
  onSave: (s: NohiSettings) => void
}

interface EditingServer {
  id?: string
  name: string
  command: string
  args: string
  env: string   // key=value pairs, one per line
  enabled: boolean
}

export default function McpPage({ settings, onSave }: McpPageProps) {
  const { language } = useLanguage()
  const t = (en: string, zh: string) => language === 'zh' ? zh : en

  const servers = settings.mcpServers ?? []
  const [editing, setEditing] = useState<EditingServer | null>(null)
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [serverTools, setServerTools] = useState<Record<string, string[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch connection statuses
  useEffect(() => {
    if (window.nohi?.mcp) {
      window.nohi.mcp.status().then(setStatuses).catch(() => {})
    }
  }, [servers])

  // Fetch tools for expanded server
  useEffect(() => {
    if (expandedId && window.nohi?.mcp && !serverTools[expandedId]) {
      window.nohi.mcp.tools(expandedId).then(tools => {
        setServerTools(prev => ({ ...prev, [expandedId]: tools }))
      }).catch(() => {})
    }
  }, [expandedId, serverTools])

  const parseEnv = (envStr: string): Record<string, string> | undefined => {
    const lines = envStr.trim().split('\n').filter(Boolean)
    if (lines.length === 0) return undefined
    const env: Record<string, string> = {}
    for (const line of lines) {
      const eq = line.indexOf('=')
      if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
    return Object.keys(env).length > 0 ? env : undefined
  }

  const serializeEnv = (env?: Record<string, string>): string => {
    if (!env) return ''
    return Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n')
  }

  const saveServer = useCallback(() => {
    if (!editing) return
    const newServer: McpServerConfig = {
      id: editing.id || crypto.randomUUID(),
      name: editing.name,
      command: editing.command,
      args: editing.args.split(/\s+/).filter(Boolean),
      env: parseEnv(editing.env),
      enabled: editing.enabled,
    }
    const updated = editing.id
      ? servers.map(s => s.id === editing.id ? newServer : s)
      : [...servers, newServer]
    onSave({ ...settings, mcpServers: updated })
    setEditing(null)
    toast.success(t('MCP server saved', 'MCP 服务器已保存'))
  }, [editing, servers, settings, onSave, t])

  const deleteServer = useCallback((id: string) => {
    onSave({ ...settings, mcpServers: servers.filter(s => s.id !== id) })
    toast.success(t('Server removed', '已删除'))
  }, [servers, settings, onSave, t])

  const toggleServer = useCallback((id: string, enabled: boolean) => {
    onSave({ ...settings, mcpServers: servers.map(s => s.id === id ? { ...s, enabled } : s) })
  }, [servers, settings, onSave])

  const reconnect = useCallback(async (id: string) => {
    if (window.nohi?.mcp) {
      toast.info(t('Reconnecting...', '重新连接中...'))
      await window.nohi.mcp.reconnect(id).catch(() => {})
      const s = await window.nohi.mcp.status().catch(() => ({}))
      setStatuses(s as Record<string, string>)
    }
  }, [t])

  const statusColor = (id: string) => {
    const s = statuses[id]
    if (s === 'connected') return 'bg-emerald-500'
    if (s === 'error') return 'bg-red-500'
    return 'bg-muted-foreground/30'
  }

  const statusLabel = (id: string) => {
    const s = statuses[id]
    if (s === 'connected') return t('Connected', '已连接')
    if (s === 'error') return t('Error', '错误')
    return t('Disconnected', '未连接')
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {t('MCP Servers', 'MCP 服务器')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              `${servers.length} server${servers.length !== 1 ? 's' : ''} configured. MCP servers extend the AI agent with additional tools.`,
              `${servers.length} 个服务器。MCP 服务器为 AI 代理提供额外的工具能力。`
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing({ name: '', command: '', args: '', env: '', enabled: true })}
        >
          {t('+ Add Server', '+ 添加服务器')}
        </Button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="rounded-2xl border border-border p-5 space-y-4 bg-muted/10">
          <p className="text-sm font-semibold text-foreground">
            {editing.id ? t('Edit Server', '编辑服务器') : t('Add New Server', '添加新服务器')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('Name', '名称')}</label>
              <Input
                placeholder="e.g. Shopify MCP"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('Command', '命令')}</label>
              <Input
                placeholder="e.g. npx, node, python"
                value={editing.command}
                onChange={e => setEditing({ ...editing, command: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('Arguments (space-separated)', '参数（空格分隔）')}</label>
            <Input
              placeholder="e.g. -y @modelcontextprotocol/server-github"
              value={editing.args}
              onChange={e => setEditing({ ...editing, args: e.target.value })}
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t('Environment Variables (one per line, KEY=VALUE)', '环境变量（每行一个，KEY=VALUE）')}</label>
            <textarea
              placeholder={'GITHUB_TOKEN=ghp_xxx\nSHOPIFY_API_KEY=shpat_xxx'}
              value={editing.env}
              onChange={e => setEditing({ ...editing, env: e.target.value })}
              className="w-full min-h-[80px] rounded-xl border border-input bg-background p-3 text-xs font-mono resize-y"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={editing.enabled} onCheckedChange={v => setEditing({ ...editing, enabled: v })} />
            <span className="text-xs text-muted-foreground">{t('Enabled', '启用')}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveServer} disabled={!editing.name.trim() || !editing.command.trim()}>
              {t('Save', '保存')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
              {t('Cancel', '取消')}
            </Button>
          </div>
        </div>
      )}

      {/* Server List */}
      {servers.length === 0 && !editing ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground mb-3">
            {t('No MCP servers configured yet.', '尚未配置 MCP 服务器。')}
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            {t(
              'MCP (Model Context Protocol) servers let you connect external tools like GitHub, Shopify, databases, and more to the AI agent.',
              'MCP（模型上下文协议）服务器让你将 GitHub、Shopify、数据库等外部工具连接到 AI 代理。'
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing({ name: '', command: '', args: '', env: '', enabled: true })}
          >
            {t('Add your first server', '添加第一个服务器')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {servers.map(srv => {
            const isExpanded = expandedId === srv.id
            const tools = serverTools[srv.id] ?? []
            return (
              <div
                key={srv.id}
                className={cn(
                  'rounded-2xl border transition-colors',
                  srv.enabled ? 'border-border bg-background' : 'border-border/50 bg-muted/20 opacity-60'
                )}
              >
                {/* Server header */}
                <div className="flex items-center gap-3 p-4">
                  <div className={cn('size-2.5 rounded-full shrink-0', statusColor(srv.id))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{srv.name}</span>
                      <Badge variant={srv.enabled ? 'default' : 'secondary'} className="text-[9px]">
                        {statusLabel(srv.id)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                      {srv.command} {srv.args.join(' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : srv.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? t('Collapse', '收起') : t('Tools', '工具')}
                    </button>
                    <button
                      type="button"
                      onClick={() => reconnect(srv.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('Reconnect', '重连')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({
                        id: srv.id, name: srv.name, command: srv.command,
                        args: srv.args.join(' '), env: serializeEnv(srv.env), enabled: srv.enabled,
                      })}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('Edit', '编辑')}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteServer(srv.id)}
                      className="text-[11px] text-destructive/70 hover:text-destructive transition-colors"
                    >
                      {t('Delete', '删除')}
                    </button>
                    <Switch
                      checked={srv.enabled}
                      onCheckedChange={v => toggleServer(srv.id, v)}
                    />
                  </div>
                </div>

                {/* Expanded tools list */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    {tools.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        {t('No tools discovered (server may be disconnected)', '未发现工具（服务器可能未连接）')}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {tools.map(toolName => (
                          <span key={toolName} className="px-2 py-1 rounded-lg bg-muted text-[10px] font-mono text-muted-foreground">
                            {toolName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
