import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAIStore } from '@/store/ai-store'
import { useActivityStore } from '@/store/activity-store'
import { useLanguage } from '@/lib/language-context'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Home,
  Package,
  Layers,
  Radio,
  BarChart3,
  Settings,
  RefreshCw,
  Send,
  PenLine,
  DollarSign,
  Clock,
  MessageCirclePlus,
  PanelLeft,
  Search,
  MessageCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommandEntry {
  id: string
  label: string
  labelZh: string
  icon: React.ReactNode
  action: () => void
  group: 'Navigate' | 'Actions' | 'Recent'
  shortcut?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { toggleConsole } = useAIStore()
  const { activities } = useActivityStore()
  const { language } = useLanguage()

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const go = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  const isZh = language === 'zh'

  const navigationCommands: CommandEntry[] = [
    {
      id: 'chat',
      label: 'Chat',
      labelZh: '对话',
      icon: <MessageCircle className="size-4" />,
      action: () => go('/chat'),
      group: 'Navigate',
    },
    {
      id: 'home',
      label: 'Home',
      labelZh: '主页',
      icon: <Home className="size-4" />,
      action: () => go('/seller'),
      group: 'Navigate',
    },
    {
      id: 'catalog',
      label: 'Agentic Catalog',
      labelZh: '智能目录',
      icon: <Package className="size-4" />,
      action: () => go('/seller/catalog/own-supply'),
      group: 'Navigate',
    },
    {
      id: 'brand',
      label: 'Brand Context',
      labelZh: '品牌背景',
      icon: <Layers className="size-4" />,
      action: () => go('/seller/brand-context'),
      group: 'Navigate',
    },
    {
      id: 'channels',
      label: 'Channel Control',
      labelZh: '渠道管理',
      icon: <Radio className="size-4" />,
      action: () => go('/seller/channels/conversational-storefront'),
      group: 'Navigate',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      labelZh: '数据分析',
      icon: <BarChart3 className="size-4" />,
      action: () => go('/seller/analytics'),
      group: 'Navigate',
    },
    {
      id: 'settings',
      label: 'Settings',
      labelZh: '设置',
      icon: <Settings className="size-4" />,
      action: () => go('/seller/settings'),
      group: 'Navigate',
    },
  ]

  // Chat-specific actions are broadcast as CustomEvents so the palette can
  // live in the shell layer without reaching into chat-layout state. Both
  // ChatLayout (new session, toggle sidebar) and ChatPage (focus search)
  // listen on these event names. Outside /chat, New Chat still navigates.
  const fireChat = (detail: string): void => {
    window.dispatchEvent(new CustomEvent('nohi:chat-action', { detail }))
    setOpen(false)
  }

  const chatActionCommands: CommandEntry[] = [
    {
      id: 'chat-new',
      label: 'New Chat',
      labelZh: '新对话',
      icon: <MessageCirclePlus className="size-4" />,
      action: () => {
        // Navigate to /chat first so the layout-level listener is mounted.
        navigate('/chat')
        // Allow the Outlet to mount before firing — layout's useEffect runs
        // synchronously on mount, so a microtask is enough.
        queueMicrotask(() => fireChat('new-session'))
      },
      group: 'Actions',
      shortcut: '⌘N',
    },
    {
      id: 'chat-toggle-sidebar',
      label: 'Toggle Session Sidebar',
      labelZh: '切换会话侧栏',
      icon: <PanelLeft className="size-4" />,
      action: () => fireChat('toggle-sidebar'),
      group: 'Actions',
    },
    {
      id: 'chat-search',
      label: 'Search Sessions',
      labelZh: '搜索对话',
      icon: <Search className="size-4" />,
      action: () => {
        navigate('/chat')
        queueMicrotask(() => fireChat('focus-search'))
      },
      group: 'Actions',
      shortcut: '⌘F',
    },
  ]

  const actionCommands: CommandEntry[] = [
    ...chatActionCommands,
    {
      id: 'sync-catalog',
      label: 'Sync Catalog',
      labelZh: '同步目录',
      icon: <RefreshCw className="size-4" />,
      action: () => {
        // TODO: trigger catalog sync via IPC
        setOpen(false)
      },
      group: 'Actions',
    },
    {
      id: 'push-channels',
      label: 'Push to All Channels',
      labelZh: '推送至所有渠道',
      icon: <Send className="size-4" />,
      action: () => {
        // TODO: trigger channel push via IPC
        setOpen(false)
      },
      group: 'Actions',
    },
    {
      id: 'generate-content',
      label: 'Generate Content (AI Write)',
      labelZh: 'AI 写作',
      icon: <PenLine className="size-4" />,
      action: () => {
        toggleConsole()
        setOpen(false)
      },
      group: 'Actions',
      shortcut: '⌘J',
    },
    {
      id: 'cost-report',
      label: 'Go to Analytics',
      labelZh: '查看数据分析',
      icon: <DollarSign className="size-4" />,
      action: () => go('/seller/analytics'),
      group: 'Actions',
    },
  ]

  // Last 5 activity items surfaced as recent actions
  const recentCommands: CommandEntry[] = activities.slice(0, 5).map((item) => ({
    id: `recent-${item.id}`,
    label: item.label,
    labelZh: item.label,
    icon: <Clock className="size-4" />,
    action: () => setOpen(false),
    group: 'Recent' as const,
  }))

  const placeholder = isZh ? '搜索或输入命令…' : 'Search or type a command…'
  const emptyText = isZh ? '未找到结果。' : 'No results found.'

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>

          {/* Navigate */}
          <CommandGroup heading={isZh ? '导航' : 'Navigate'}>
            {navigationCommands.map((cmd) => (
              <CommandItem key={cmd.id} onSelect={cmd.action} className="gap-2">
                {cmd.icon}
                <span>{isZh ? cmd.labelZh : cmd.label}</span>
                {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions */}
          <CommandGroup heading={isZh ? '操作' : 'Actions'}>
            {actionCommands.map((cmd) => (
              <CommandItem key={cmd.id} onSelect={cmd.action} className="gap-2">
                {cmd.icon}
                <span>{isZh ? cmd.labelZh : cmd.label}</span>
                {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>

          {/* Recent — only show if we have activity */}
          {recentCommands.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={isZh ? '最近活动' : 'Recent Activity'}>
                {recentCommands.map((cmd) => (
                  <CommandItem key={cmd.id} onSelect={cmd.action} className="gap-2">
                    {cmd.icon}
                    <span className="truncate">{isZh ? cmd.labelZh : cmd.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
