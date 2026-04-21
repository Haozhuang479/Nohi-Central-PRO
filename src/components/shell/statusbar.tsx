import { useAIStore } from '@/store/ai-store'
import { useCostStore } from '@/store/cost-store'
import { useChannelState } from '@/lib/channel-state'
import { cn } from '@/lib/utils'

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

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
  if (model.includes('opus')) return 'Claude Opus 4'
  if (model.includes('haiku')) return 'Claude Haiku 4.5'
  if (model.includes('sonnet')) return 'Claude Sonnet 4.6'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('deepseek')) return 'DeepSeek'
  return model
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Statusbar() {
  const { provider, model, isRunning } = useAIStore()
  // Read the accumulated spend directly instead of recomputing from a single
  // model — the day's tokens may span multiple models and we already paid
  // the right rate at addEntry time.
  const { todaySpend, getTotalTokens } = useCostStore()
  const { channelStates } = useChannelState()

  const totalTokens = getTotalTokens()
  const cost = todaySpend

  const activeChannels = Object.values(channelStates).filter(
    (s) => s === 'active' || s === 'always-on'
  ).length

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 gap-4 shrink-0',
        'h-[var(--statusbar-height,28px)]',
        'bg-sidebar border-t border-sidebar-border',
        'select-none'
      )}
    >
      {/* Left: provider · model + running pulse */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            isRunning ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/25'
          )}
        />
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {providerLabel(provider)} · {modelShortLabel(model)}
        </span>
        {isRunning && (
          <span className="text-[11px] text-muted-foreground animate-pulse">Running…</span>
        )}
      </div>

      {/* Center: tokens today + cost */}
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {totalTokens > 0
          ? `Tokens today: ${formatTokens(totalTokens)} ($${cost.toFixed(2)})`
          : 'Tokens today: —'}
      </span>

      {/* Right: channels live + version */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {activeChannels} channel{activeChannels !== 1 ? 's' : ''} live
        </span>
        <span className="text-[11px] text-muted-foreground/40">·</span>
        <span className="text-[11px] text-muted-foreground/50">v1.0.0</span>
      </div>
    </div>
  )
}
