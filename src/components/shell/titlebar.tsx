import { cn } from '@/lib/utils'
import { useAIStore } from '@/store/ai-store'
import { useCostStore, calcCost } from '@/store/cost-store'
import { Bell, Settings } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// ── Provider label helpers ────────────────────────────────────────────────────

function providerLabel(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic'
    case 'openai':
      return 'OpenAI'
    case 'kimi':
      return 'Kimi'
    case 'minimax':
      return 'MiniMax'
    case 'deepseek':
      return 'DeepSeek'
    default:
      return provider
  }
}

function modelShortLabel(model: string): string {
  if (model.includes('opus')) return 'Opus 4'
  if (model.includes('haiku')) return 'Haiku 4.5'
  if (model.includes('sonnet')) return 'Sonnet 4.6'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('deepseek')) return 'DeepSeek'
  return model
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Titlebar() {
  const { provider, model } = useAIStore()
  const { todayInputTokens, todayOutputTokens, getTotalTokens } = useCostStore()
  const location = useLocation()
  const navigate = useNavigate()

  const cost = calcCost(todayInputTokens, todayOutputTokens, model)
  const totalTokens = getTotalTokens()

  return (
    <div
      // The entire bar is a drag region for macOS window dragging.
      // Non-interactive children override with style={{ WebkitAppRegion: 'no-drag' }}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={cn(
        'relative flex items-center justify-between shrink-0 z-50',
        'h-[var(--titlebar-height,38px)]',
        'bg-sidebar border-b border-sidebar-border',
        'select-none'
      )}
    >
      {/* ── Left: macOS traffic light spacer (72 px) ── */}
      {/* We don't render the buttons — macOS draws them in this gap */}
      <div className="flex items-center gap-2">
        <div className="w-[70px] shrink-0" />
        {/* App title — still draggable */}
        <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
          Nohi Central PRO
        </span>
      </div>

      {/* ── Center: Chat / Central mode switcher ── */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="absolute left-1/2 -translate-x-1/2 flex items-center"
      >
        <div className="flex items-center gap-0.5 bg-[#2a2a2a] rounded-lg p-0.5">
          {[
            { label: 'Chat', path: '/chat' },
            { label: 'Central', path: '/seller' },
          ].map(({ label, path }) => {
            const active = location.pathname.startsWith(path)
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'px-3 py-1 rounded-md text-[12px] font-medium transition-all',
                  active
                    ? 'bg-white text-[#1a1a1a] shadow-sm'
                    : 'text-[#aaa] hover:text-white'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: non-draggable controls ── */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2 pr-3"
      >
        {/* Provider + model badge */}
        <span className="text-[11px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full tabular-nums">
          {providerLabel(provider)} · {modelShortLabel(model)}
        </span>

        {/* Cost badge — shown once there are tokens */}
        {totalTokens > 0 && (
          <span className="text-[11px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full tabular-nums">
            ${cost.toFixed(4)} today
          </span>
        )}

        {/* Notification bell */}
        <button
          className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-3.5" />
        </button>

        {/* Settings shortcut */}
        <Link
          to="/seller/settings"
          className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
