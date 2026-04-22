// Reusable empty-state panel for list pages.
//
// Before v2.8.3 each list page rolled its own "no items" text — some had
// a CTA, some had a generic line, some had a blank scroll area. Using this
// component keeps the look + language consistent and cuts the copy-paste.

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  ctaLabel?: string
  onCta?: () => void
  className?: string
}

export function EmptyState({ title, description, icon, ctaLabel, onCta, className }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 px-6 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {ctaLabel && onCta && (
        <Button size="sm" onClick={onCta} className="mt-1">
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
