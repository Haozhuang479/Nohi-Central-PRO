// Meta DPA-style card — square image, title, price, "Shop now" CTA.
// Based on the visual pattern Meta uses in Dynamic Product Ads.

import { cn } from '@/lib/utils'
import type { CardViewModel } from './types'

export function MetaDPACard({ card, className }: { card: CardViewModel; className?: string }): React.ReactElement {
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('block rounded-xl overflow-hidden border border-border/40 bg-background hover:shadow-lg transition-shadow max-w-[280px]', className)}
    >
      <div className="relative aspect-square bg-muted">
        {card.imageUrl && <img src={card.imageUrl} alt={card.title} className="absolute inset-0 size-full object-cover" />}
        {card.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {card.badges.map((b, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-white font-medium">{b}</span>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        {card.subtitle && <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.subtitle}</p>}
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{card.title}</p>
        <div className="flex items-baseline gap-2">
          {card.price && <span className="text-base font-semibold text-foreground">{card.price}</span>}
          {card.comparePrice && <span className="text-xs text-muted-foreground line-through">{card.comparePrice}</span>}
        </div>
        <button
          type="button"
          className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          onClick={(e) => e.stopPropagation()}
        >
          Shop Now
        </button>
      </div>
    </a>
  )
}
