// MetricCard — small summary tile used in the analytics top row.
// Extracted from analytics/page.tsx (Phase E) so the host page shrinks
// and so future dashboards (home, seller-home) can drop-in the same card.

import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  change: string
  positive: boolean
}

export function MetricCard({
  label,
  value,
  change,
  positive,
}: MetricCardProps): JSX.Element {
  return (
    <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </span>
      <span
        className={cn(
          'text-xs font-medium tabular-nums',
          positive ? 'text-foreground' : 'text-destructive',
        )}
      >
        {change}
      </span>
    </div>
  )
}
