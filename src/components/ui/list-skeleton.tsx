// Placeholder rows shown while an IPC list call is in flight.
//
// The v2.7.2 UX audit flagged 5+ list pages that rendered empty UI between
// "page mounted" and "data arrived", leading users to think nothing existed.
// This component fills that gap with shimmering rows that match the final
// list's rhythm.

import { cn } from '@/lib/utils'

interface ListSkeletonProps {
  rows?: number
  /** Approximate height of each placeholder row. */
  rowHeightClass?: string
  className?: string
}

export function ListSkeleton({ rows = 4, rowHeightClass = 'h-16', className }: ListSkeletonProps): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-2 py-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-full rounded-xl bg-muted/40 animate-pulse',
            rowHeightClass,
          )}
        />
      ))}
    </div>
  )
}
