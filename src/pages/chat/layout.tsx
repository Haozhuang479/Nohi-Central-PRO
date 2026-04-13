import React, { useState, useEffect, useCallback, useMemo } from 'react'
import nohiLogo from '@/assets/nohi-logo.svg'
import { Outlet, useOutletContext, Link } from 'react-router-dom'
import { Titlebar } from '@/components/shell/titlebar'
import { CommandPalette } from '@/components/shell/command-palette'
import { useAIStore } from '@/store/ai-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import type { NohiSettings, Session } from '../../../electron/main/engine/types'

interface ChatLayoutProps {
  settings: NohiSettings
  onSettingsSave: (s: NohiSettings) => void
}

export interface ChatOutletContext {
  createNewSession: () => Promise<void>
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function useChatOutletContext() {
  return useOutletContext<ChatOutletContext>()
}

// ─── Date grouping ────────────────────────────────────────────────────────────

function getSessionGroup(ts: number): 'today' | 'yesterday' | 'week' | 'older' {
  const now = Date.now()
  const diff = now - ts
  const day = 24 * 60 * 60 * 1000
  if (diff < day) return 'today'
  if (diff < 2 * day) return 'yesterday'
  if (diff < 7 * day) return 'week'
  return 'older'
}

function groupLabel(group: string, language: string): string {
  if (language === 'zh') {
    if (group === 'today') return '今天'
    if (group === 'yesterday') return '昨天'
    if (group === 'week') return '本周'
    return '更早'
  }
  if (group === 'today') return 'Today'
  if (group === 'yesterday') return 'Yesterday'
  if (group === 'week') return 'This Week'
  return 'Older'
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function ChatLayout({ settings, onSettingsSave }: ChatLayoutProps) {
  void onSettingsSave

  const { language } = useLanguage()
  const { session, sessions, setSessions, setSession } = useAIStore()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Load sessions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.nohi?.sessions) {
      window.nohi.sessions
        .list()
        .then((list: Session[]) => {
          setSessions(list)
          if (list.length > 0 && !session) {
            setSession(list[0])
          }
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createNewSession = useCallback(async () => {
    const model = useAIStore.getState().model
    const stub: Session = {
      id: crypto.randomUUID(),
      title: language === 'zh' ? '新对话' : 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model,
      workingDir: settings.workingDir,
    }

    if (typeof window !== 'undefined' && window.nohi?.sessions) {
      try {
        const s = await window.nohi.sessions.create(model)
        setSession(s)
        setSessions((prev: Session[]) => [s, ...prev])
        return
      } catch {
        // fall through
      }
    }
    setSession(stub)
    setSessions((prev: Session[]) => [stub, ...prev])
  }, [language, settings.workingDir, setSession, setSessions])

  const deleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && window.nohi?.sessions) {
      try {
        await window.nohi.sessions.delete(id)
      } catch {
        // ignore
      }
    }
    setSessions((prev: Session[]) => prev.filter((s) => s.id !== id))
    if (session?.id === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      setSession(remaining.length > 0 ? remaining[0] : null)
    }
  }, [session, sessions, setSessions, setSession])

  // Filter + group sessions
  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions
    const q = search.toLowerCase()
    return sessions.filter((s) =>
      (s.title || '').toLowerCase().includes(q)
    )
  }, [sessions, search])

  const grouped = useMemo(() => {
    const order = ['today', 'yesterday', 'week', 'older'] as const
    const map: Record<string, Session[]> = {}
    for (const s of filteredSessions) {
      const g = getSessionGroup(s.updatedAt ?? s.createdAt)
      if (!map[g]) map[g] = []
      map[g].push(s)
    }
    return order.filter((g) => map[g]?.length).map((g) => ({ group: g, items: map[g] }))
  }, [filteredSessions])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* macOS traffic lights + drag region */}
      <Titlebar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Session sidebar ──────────────────────────────────────── */}
        <aside
          className={cn(
            'flex flex-col sidebar-glass bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 overflow-hidden',
            sidebarOpen ? 'w-[220px]' : 'w-0'
          )}
        >
          {/* Header: branding */}
          <div className="flex items-center justify-between px-4 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <img src={nohiLogo} alt="Nohi" className="h-[60px] w-auto object-contain" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 drop-shadow-sm">
                PRO
              </span>
            </div>
          </div>

          {/* Quick nav: Automation / Connectors / MCPs / Skills */}
          <div className="px-3 pb-1 shrink-0">
            {(
              [
                { label: language === 'zh' ? '自动化' : 'Automation', to: '/seller' },
                { label: language === 'zh' ? '连接器' : 'Connectors', to: '/seller/catalog/connectors' },
                { label: 'MCPs', to: '/seller/settings' },
                { label: language === 'zh' ? '技能' : 'Skills', to: '/seller/settings' },
              ] as const
            ).map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center w-full px-3 py-1.5 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* New Chat button */}
          <div className="px-3 pb-2 shrink-0">
            <button
              type="button"
              onClick={createNewSession}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <span>{language === 'zh' ? '+ 新对话' : '+ New Chat'}</span>
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'zh' ? '搜索对话…' : 'Search chats…'}
                className="flex-1 bg-transparent text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none min-w-0"
              />
            </div>
          </div>

          {/* Session list grouped */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filteredSessions.length === 0 ? (
              <p className="text-xs text-sidebar-foreground/40 text-center py-6 px-3">
                {search
                  ? (language === 'zh' ? '无匹配结果' : 'No results')
                  : (language === 'zh' ? '暂无对话' : 'No chats yet')}
              </p>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group} className="mb-1">
                  <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {groupLabel(group, language)}
                  </p>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSession(s)}
                      onMouseEnter={() => setHoveredId(s.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={cn(
                        'group/item relative flex items-center w-full px-2 py-1.5 rounded-lg text-left transition-colors',
                        session?.id === s.id
                          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                      )}
                    >
                      <span className="flex-1 text-xs truncate pr-5">
                        {s.title || (language === 'zh' ? '新对话' : 'New Chat')}
                      </span>
                      {hoveredId === s.id && (
                        <button
                          type="button"
                          onClick={(e) => deleteSession(s.id, e)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-5 rounded-md text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors text-xs"
                        >
                          ×
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 shrink-0">
            <Link
              to="/seller/settings"
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground text-sidebar text-xs font-semibold">
                N
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium text-sidebar-foreground truncate">
                  {settings.storeName || 'Demo'}
                </span>
                <span className="text-[10px] text-sidebar-foreground/50">PRO Plan</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ── Main chat area ────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <main className="flex-1 overflow-hidden">
            <Outlet context={{ createNewSession, sidebarOpen, setSidebarOpen } satisfies ChatOutletContext} />
          </main>
        </div>
      </div>

      {/* Cmd+K command palette */}
      <CommandPalette />
    </div>
  )
}
