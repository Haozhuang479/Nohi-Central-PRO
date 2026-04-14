import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useChatOutletContext } from './layout'
import type { NohiSettings, McpServerConfig } from '../../../electron/main/engine/types'

interface McpPageProps {
  settings: NohiSettings
  onSave: (s: NohiSettings) => void
}

interface EditingServer {
  id?: string
  name: string
  command: string
  args: string
  env: string
  enabled: boolean
}

export default function ChatMcpPage({ settings, onSave }: McpPageProps) {
  const { language } = useLanguage()
  const { sidebarOpen, setSidebarOpen } = useChatOutletContext()
  const t = (en: string, zh: string) => language === 'zh' ? zh : en

  const servers = settings.mcpServers ?? []
  const [editing, setEditing] = useState<EditingServer | null>(null)
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [serverTools, setServerTools] = useState<Record<string, string[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (window.nohi?.mcp) window.nohi.mcp.status().then(setStatuses).catch(() => {})
  }, [servers])

  useEffect(() => {
    if (expandedId && window.nohi?.mcp && !serverTools[expandedId]) {
      window.nohi.mcp.tools(expandedId).then(tools => setServerTools(prev => ({ ...prev, [expandedId]: tools }))).catch(() => {})
    }
  }, [expandedId, serverTools])

  const parseEnv = (s: string): Record<string, string> | undefined => {
    const lines = s.trim().split('\n').filter(Boolean)
    if (!lines.length) return undefined
    const env: Record<string, string> = {}
    for (const line of lines) { const eq = line.indexOf('='); if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim() }
    return Object.keys(env).length ? env : undefined
  }

  const serializeEnv = (env?: Record<string, string>): string =>
    env ? Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') : ''

  const saveServer = useCallback(() => {
    if (!editing) return
    const srv: McpServerConfig = {
      id: editing.id || crypto.randomUUID(), name: editing.name, command: editing.command,
      args: editing.args.split(/\s+/).filter(Boolean), env: parseEnv(editing.env), enabled: editing.enabled,
    }
    const updated = editing.id ? servers.map(s => s.id === editing.id ? srv : s) : [...servers, srv]
    onSave({ ...settings, mcpServers: updated })
    setEditing(null)
    toast.success(t('Saved', '已保存'))
  }, [editing, servers, settings, onSave, t])

  const deleteServer = useCallback((id: string) => {
    onSave({ ...settings, mcpServers: servers.filter(s => s.id !== id) })
    toast.success(t('Deleted', '已删除'))
  }, [servers, settings, onSave, t])

  const toggleServer = useCallback((id: string, enabled: boolean) => {
    onSave({ ...settings, mcpServers: servers.map(s => s.id === id ? { ...s, enabled } : s) })
  }, [servers, settings, onSave])

  const reconnect = useCallback(async (id: string) => {
    if (window.nohi?.mcp) {
      await window.nohi.mcp.reconnect(id).catch(() => {})
      setStatuses(await window.nohi.mcp.status().catch(() => ({})) as Record<string, string>)
    }
  }, [])

  const statusColor = (id: string) => {
    const s = statuses[id]
    return s === 'connected' ? 'bg-emerald-500' : s === 'error' ? 'bg-red-500' : 'bg-muted-foreground/30'
  }
  const statusLabel = (id: string) => {
    const s = statuses[id]
    return s === 'connected' ? t('Connected', '已连接') : s === 'error' ? t('Error', '错误') : t('Offline', '离线')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button type="button" onClick={() => setSidebarOpen(v => !v)} className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <span className="text-sm">{sidebarOpen ? '←' : '→'}</span>
        </button>
        <h1 className="text-sm font-semibold text-foreground">{t('MCP Servers', 'MCP 服务器')}</h1>
        <span className="text-xs text-muted-foreground">{servers.length} {t('configured', '已配置')}</span>
        <div className="flex-1" />
        <Button size="sm" className="text-xs h-7" onClick={() => setEditing({ name: '', command: '', args: '', env: '', enabled: true })}>
          {t('+ Add', '+ 添加')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Editor */}
        {editing && (
          <div className="rounded-2xl border border-border p-4 space-y-3 bg-muted/10 mb-4">
            <p className="text-xs font-semibold">{editing.id ? t('Edit Server', '编辑') : t('Add Server', '添加')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="text-xs h-8" />
              <Input placeholder="Command (npx, node...)" value={editing.command} onChange={e => setEditing({ ...editing, command: e.target.value })} className="text-xs h-8 font-mono" />
            </div>
            <Input placeholder="Arguments (space-separated)" value={editing.args} onChange={e => setEditing({ ...editing, args: e.target.value })} className="text-xs h-8 font-mono" />
            <textarea placeholder="Environment vars (KEY=VALUE per line)" value={editing.env} onChange={e => setEditing({ ...editing, env: e.target.value })} className="w-full min-h-[60px] rounded-xl border border-input bg-background p-3 text-xs font-mono resize-y" />
            <div className="flex items-center gap-3">
              <Switch checked={editing.enabled} onCheckedChange={v => setEditing({ ...editing, enabled: v })} />
              <span className="text-xs text-muted-foreground">{t('Enabled', '启用')}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={saveServer} disabled={!editing.name.trim() || !editing.command.trim()}>{t('Save', '保存')}</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(null)}>{t('Cancel', '取消')}</Button>
            </div>
          </div>
        )}

        {/* Server list */}
        {servers.length === 0 && !editing ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-2">{t('No MCP servers yet.', '尚未配置 MCP 服务器。')}</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              {t('Connect external tools like GitHub, Shopify, or databases to the AI agent.', '将 GitHub、Shopify、数据库等外部工具连接到 AI 代理。')}
            </p>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditing({ name: '', command: '', args: '', env: '', enabled: true })}>
              {t('Add your first server', '添加第一个服务器')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {servers.map(srv => {
              const isExpanded = expandedId === srv.id
              const tools = serverTools[srv.id] ?? []
              return (
                <div key={srv.id} className={cn('rounded-xl border transition-colors', srv.enabled ? 'border-border bg-background' : 'border-border/50 bg-muted/10 opacity-50')}>
                  <div className="flex items-center gap-2.5 p-3">
                    <div className={cn('size-2 rounded-full shrink-0', statusColor(srv.id))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{srv.name}</span>
                        <Badge variant={srv.enabled ? 'default' : 'secondary'} className="text-[8px] px-1 py-0">{statusLabel(srv.id)}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{srv.command} {srv.args.join(' ')}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : srv.id)} className="text-[10px] text-muted-foreground hover:text-foreground">{isExpanded ? t('Hide', '收起') : t('Tools', '工具')}</button>
                      <button type="button" onClick={() => reconnect(srv.id)} className="text-[10px] text-muted-foreground hover:text-foreground">{t('Reconnect', '重连')}</button>
                      <button type="button" onClick={() => setEditing({ id: srv.id, name: srv.name, command: srv.command, args: srv.args.join(' '), env: serializeEnv(srv.env), enabled: srv.enabled })} className="text-[10px] text-muted-foreground hover:text-foreground">{t('Edit', '编辑')}</button>
                      <button type="button" onClick={() => deleteServer(srv.id)} className="text-[10px] text-destructive/70 hover:text-destructive">{t('Del', '删')}</button>
                      <Switch checked={srv.enabled} onCheckedChange={v => toggleServer(srv.id, v)} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/30 pt-2">
                      {tools.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">{t('No tools (disconnected?)', '无工具（未连接？）')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tools.map(name => <span key={name} className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono text-muted-foreground">{name}</span>)}
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
    </div>
  )
}
