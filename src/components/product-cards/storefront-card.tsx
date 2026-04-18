// Nohi Conversational Storefront card — the richest layout. Full description,
// image gallery strip, brand, tags, buy CTA.

import { cn } from '@/lib/utils'
import type { CardViewModel } from './types'

export function StorefrontCard({ card, className }: { card: CardViewModel; className?: string }): React.ReactElement {
  const images = [card.imageUrl, ...card.extraImages].filter(Boolean) as string[]
  return (
    <div className={cn('rounded-2xl border border-border/40 bg-background overflow-hidden max-w-md', className)}>
      {/* Image strip */}
      {images.length > 0 && (
        <div className="flex gap-1 overflow-x-auto p-1">
          {images.slice(0, 5).map((src, i) => (
            <img key={i} src={src} alt="" className={cn('shrink-0 rounded-lg object-cover', i === 0 ? 'w-full aspect-[4/3]' : 'size-16')} />
          ))}
        </div>
      )}
      <div className="p-4 space-y-3">
        <div>
          {card.subtitle && <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.subtitle}</p>}
          <h3 className="text-lg font-semibold text-foreground leading-tight">{card.title}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            {card.price && <span className="text-xl font-bold text-foreground">{card.price}</span>}
            {card.comparePrice && <span className="text-sm text-muted-foreground line-through">{card.comparePrice}</span>}
            {card.badges.map((b, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">{b}</span>
            ))}
          </div>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{card.summary}</p>
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((t, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-2.5 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
        >
          {card.available ? 'Buy now' : 'Out of stock'}
        </a>
      </div>
    </div>
  )
}
