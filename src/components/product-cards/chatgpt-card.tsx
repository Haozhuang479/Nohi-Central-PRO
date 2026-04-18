// ChatGPT-style product card — the compact horizontal layout ChatGPT uses
// when suggesting products. Image left, title + price + CTA on the right.

import { cn } from '@/lib/utils'
import type { CardViewModel } from './types'

export function ChatGPTProductCard({ card, className }: { card: CardViewModel; className?: string }): React.ReactElement {
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex gap-3 rounded-2xl border border-border/40 bg-background p-3 hover:bg-muted/40 transition-colors max-w-lg',
        className,
      )}
    >
      {card.imageUrl && (
        <div className="shrink-0 size-20 rounded-xl overflow-hidden bg-muted">
          <img src={card.imageUrl} alt={card.title} className="size-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {card.subtitle && (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.subtitle}</p>
        )}
        <p className="text-sm font-medium text-foreground truncate">{card.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{card.summary}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {card.price && <span className="text-sm font-semibold text-foreground">{card.price}</span>}
          {card.comparePrice && <span className="text-xs text-muted-foreground line-through">{card.comparePrice}</span>}
          {card.badges.map((b, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-foreground/10 text-foreground">{b}</span>
          ))}
        </div>
      </div>
    </a>
  )
}
