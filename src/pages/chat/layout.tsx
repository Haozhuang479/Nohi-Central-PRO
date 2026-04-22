import React, { useState, useEffect, useCallback, useMemo } from 'react'
import nohiLogo from '@/assets/nohi-logo.svg'
import { Outlet, useOutletContext, Link } from 'react-router-dom'
import { Titlebar } from '@/components/shell/titlebar'
import { CommandPalette } from '@/components/shell/command-palette'
import { SessionList } from '@/components/chat/session-list'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAIStore } from '@/store/ai-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { CHAT_SIDEBAR_NAV, labelFor } from '@/lib/chat-nav'
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
  const searchInputRef = React.useRef<HTMLInputElement>(null)

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

  // Chat-action bus — the shell-layer CommandPalette dispatches
  // CustomEvent('nohi:chat-action', { detail }) for new session, sidebar
  // toggle, search focus. Keeping the palette decoupled from chat state
  // means it can live in the shell without hoisting this layout up.
  useEffect(() => {
    const onChatAction = (e: Event): void => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === 'new-session') {
        void createNewSession()
      } else if (detail === 'toggle-sidebar') {
        setSidebarOpen((v) => !v)
      } else if (detail === 'focus-search') {
        setSidebarOpen(true)
        // Wait a frame so the input is actually mounted + focusable.
        requestAnimationFrame(() => searchInputRef.current?.focus())
      }
    }
    window.addEventListener('nohi:chat-action', onChatAction)
    return () => window.removeEventListener('nohi:chat-action', onChatAction)
  // createNewSession is intentionally omitted — its deps already force the
  // handler closure to refresh when needed.
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

  const exportSession = useCallback(async (id: string, format: 'md' | 'json', e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.nohi?.sessions) return
    const full = await window.nohi.sessions.load(id)
    if (!full) return
    let content: string
    let filename: string
    // Filename: percent-encode so Chinese/emoji titles stay distinguishable
    // instead of being stripped to underscores.
    const safeName = encodeURIComponent((full.title || 'chat').slice(0, 80)).replace(/%/g, '_')
    if (format === 'json') {
      content = JSON.stringify(full, null, 2)
      filename = `${safeName}.json`
    } else {
      // Richer markdown export. Tool_use + tool_result blocks get
      // `<details>` wrappers so long outputs stay collapsed by default in
      // any markdown reader. Images get preserved inline (truncated if
      // wildly large) so a reader without the original session still sees
      // something useful.
      const lines: string[] = [
        `# ${full.title || 'Chat'}`,
        '',
        `_${new Date(full.createdAt).toLocaleString()} — ${full.model}_`,
        '',
      ]
      for (const m of full.messages) {
        lines.push(`## ${m.role === 'user' ? 'User' : 'Assistant'}`, '')
        if (typeof m.content === 'string') {
          lines.push(m.content, '')
          continue
        }
        const blocks = m.content as Array<Record<string, unknown>>
        for (const b of blocks) {
          switch (b.type) {
            case 'text':
              lines.push(String(b.text ?? ''), '')
              break
            case 'image': {
              const src = b.source as { type?: string; media_type?: string; data?: string } | undefined
              if (src?.type === 'base64' && src.data) {
                const dataUrl = `data:${src.media_type ?? 'image/png'};base64,${src.data.slice(0, 100_000)}`
                lines.push(`![image](${dataUrl})`, '')
              } else {
                lines.push('_[attached image]_', '')
              }
              break
            }
            case 'tool_use': {
              const name = String(b.name ?? 'tool')
              const input = JSON.stringify(b.input ?? {}, null, 2)
              lines.push(`<details><summary>Tool: ${name}</summary>`, '', '```json', input, '```', '', '</details>', '')
              break
            }
            case 'tool_result': {
              const body = typeof b.content === 'string' ? b.content : JSON.stringify(b.content, null, 2)
              const head = b.is_error ? 'Tool error' : 'Tool result'
              lines.push(`<details><summary>${head}</summary>`, '', body, '', '</details>', '')
              break
            }
            default:
              break
          }
        }
      }
      content = lines.join('\n')
      filename = `${safeName}.md`
    }
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

  // Two-step delete: clicking the × on a session row opens the confirm
  // dialog; only after explicit Delete does the session actually go away.
  // Sessions are persisted to disk and there is no undo — a single-click
  // destroy was the #1 "oh no" moment flagged in the v2.7.2 chat audit.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const requestDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPendingDeleteId(id)
  }, [])

  const confirmDelete = useCallback(async () => {
    const id = pendingDeleteId
    if (!id) return
    setPendingDeleteId(null)
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
  }, [pendingDeleteId, session, sessions, setSessions, setSession])

  const pendingDeleteSession = useMemo(
    () => (pendingDeleteId ? sessions.find((s) => s.id === pendingDeleteId) : null),
    [pendingDeleteId, sessions],
  )

  // Inline rename — pulls the current session from disk, patches the title,
  // persists. The sidebar store updates optimistically so typing feels
  // instant even if the disk write is a beat behind.
  const renameSession = useCallback(async (id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
    if (session?.id === id) {
      setSession({ ...session, title })
    }
    if (typeof window !== 'undefined' && window.nohi?.sessions) {
      try {
        const full = await window.nohi.sessions.load(id)
        if (full) {
          await window.nohi.sessions.save({ ...full, title, updatedAt: Date.now() })
        }
      } catch {
        // ignore; optimistic update already applied
      }
    }
  }, [session, setSession, setSessions])

  // Duplicate — loads the full session, writes a copy with a fresh id.
  const duplicateSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined' || !window.nohi?.sessions) return
    try {
      const full = await window.nohi.sessions.load(id)
      if (!full) return
      const copy: Session = {
        ...full,
        id: crypto.randomUUID(),
        title: `${full.title} (${language === 'zh' ? '副本' : 'copy'})`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await window.nohi.sessions.save(copy)
      setSessions((prev) => [copy, ...prev])
      setSession(copy)
    } catch {
      // ignore
    }
  }, [language, setSession, setSessions])

  // Full-text content search across all sessions (debounced via IPC)
  // Cache of loaded session bodies, keyed by session id. First keystroke
  // still fans out IPC loads; every subsequent keystroke hits memory so
  // typing doesn't re-issue dozens of reads to disk.
  const bodyCacheRef = React.useRef<Map<string, Session>>(new Map())
  const [contentMatchIds, setContentMatchIds] = useState<Set<string> | null>(null)
  useEffect(() => {
    if (!search.trim() || search.length < 2) { setContentMatchIds(null); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      if (!window.nohi?.sessions) return
      const matches = new Set<string>()
      const q = search.toLowerCase()
      for (const s of sessions) {
        if (cancelled) return
        if ((s.title || '').toLowerCase().includes(q)) {
          matches.add(s.id)
          continue
        }
        let full = bodyCacheRef.current.get(s.id)
        if (!full) {
          try {
            const loaded = await window.nohi.sessions.load(s.id)
            if (!loaded) continue
            full = loaded
            bodyCacheRef.current.set(s.id, loaded)
          } catch { continue }
        }
        if (cancelled) return
        const found = full.messages.some((m) => {
          const text = typeof m.content === 'string' ? m.content
            : (m.content as Array<{ type: string; text?: string }>)
                .filter((b) => b.type === 'text').map((b) => b.text ?? '').join(' ')
          return text.toLowerCase().includes(q)
        })
        if (found) matches.add(s.id)
      }
      if (!cancelled) setContentMatchIds(matches)
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search, sessions])

  // Invalidate the session-body cache when a session is saved by the agent
  // loop — otherwise the cache serves stale bodies for the active chat.
  useEffect(() => {
    if (session?.id) {
      bodyCacheRef.current.set(session.id, session)
    }
  }, [session])

  // Filter + group sessions (title fast-path + content match overlay)
  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions
    const q = search.toLowerCase()
    return sessions.filter((s) => {
      if ((s.title || '').toLowerCase().includes(q)) return true
      return contentMatchIds?.has(s.id) ?? false
    })
  }, [sessions, search, contentMatchIds])

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

          {/* Quick nav — entries come from @/lib/chat-nav so the composer
              "+ Add" menu and this sidebar never drift out of sync. */}
          <div className="px-3 pb-1 shrink-0">
            {CHAT_SIDEBAR_NAV.map((entry) => (
              <Link
                key={entry.id}
                to={entry.href}
                className="flex items-center w-full px-3 py-1.5 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <span>{labelFor(entry, language)}</span>
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
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'zh' ? '搜索对话…' : 'Search chats…'}
                className="flex-1 bg-transparent text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none min-w-0"
              />
            </div>
          </div>

          {/* Session list (virtualized when > 50 items) */}
          {filteredSessions.length === 0 ? (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <p className="text-xs text-sidebar-foreground/40 text-center py-6 px-3">
                {search
                  ? (language === 'zh' ? '无匹配结果' : 'No results')
                  : (language === 'zh' ? '暂无对话' : 'No chats yet')}
              </p>
            </div>
          ) : (
            <SessionList
              grouped={grouped}
              active={session}
              hoveredId={hoveredId}
              language={language}
              groupLabel={groupLabel}
              onSelect={setSession}
              onHover={setHoveredId}
              onExport={exportSession}
              onDelete={requestDeleteSession}
              onRename={renameSession}
              onDuplicate={duplicateSession}
            />
          )}

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

      {/* Delete-session confirmation */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'zh' ? '删除这个对话?' : 'Delete this chat?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'zh'
                ? `"${pendingDeleteSession?.title || '新对话'}" 将被永久删除，无法恢复。`
                : `"${pendingDeleteSession?.title || 'New Chat'}" will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'zh' ? '取消' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'zh' ? '删除' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
