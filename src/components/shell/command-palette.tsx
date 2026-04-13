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

  const actionCommands: CommandEntry[] = [
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
