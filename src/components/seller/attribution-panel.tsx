// Attribution panel — reads from the orders log via IPC and shows the same
// breakdown the `analyze_attribution` agent tool produces.

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface KindBucket { orders: number; gmv: number; channels?: string[] }
interface ChannelBucket { orders: number; gmv: number; aov: number }
interface Summary {
  total: { orders: number; gmv: { amount: number; currency: string } }
  byKind: { owned: KindBucket; paid: KindBucket; organic: KindBucket; unattributed: { orders: number; gmv: number } }
  byChannel: Record<string, ChannelBucket>
}

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export function AttributionPanel(): React.ReactElement {
  const [windowDays, setWindowDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [orderCount, setOrderCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (days: number) => {
    const w = window as { nohi?: { attribution?: { summary: (d?: number) => Promise<unknown> } } }
    if (!w.nohi?.attribution?.summary) return
    setLoading(true)
    setError(null)
    const resp = await w.nohi.attribution.summary(days) as
      | { ok: true; summary: Summary; orderCount: number; windowDays: number }
      | { ok: false; error: string }
    setLoading(false)
    if (!resp.ok) {
      setError(resp.error)
      return
    }
    setSummary(resp.summary)
    setOrderCount(resp.orderCount)
  }, [])

  useEffect(() => { refresh(windowDays) }, [windowDays, refresh])

  const ingest = useCallback(async () => {
    const w = window as { nohi?: { attribution?: { ingest: (d?: number) => Promise<{ ok: boolean; ingested?: number; error?: string }> } } }
    if (!w.nohi?.attribution?.ingest) return
    setIngesting(true)
    const r = await w.nohi.attribution.ingest(windowDays)
    setIngesting(false)
    if (!r.ok) {
      toast.error(r.error ?? 'Ingest failed')
      return
    }
    toast.success(`Ingested ${r.ingested ?? 0} orders.`)
    refresh(windowDays)
  }, [windowDays, refresh])

  const currency = summary?.total.gmv.currency ?? 'USD'
  const fmt = (n: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Attribution</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revenue attributed to channel, from {orderCount} orders in the last {windowDays} day{windowDays === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                onClick={() => setWindowDays(w.days)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  windowDays === w.days ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" disabled={ingesting} onClick={ingest}>
            {ingesting ? 'Ingesting…' : 'Refresh from Shopify'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive p-3 text-xs">
          {error}
        </div>
      )}

      {loading && !summary && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground">Loading…</div>
      )}

      {summary && summary.total.orders === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/5 p-6 text-center">
          <p className="text-sm text-muted-foreground">No orders in the selected window.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Click "Refresh from Shopify" to pull recent orders.</p>
        </div>
      )}

      {summary && summary.total.orders > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard label="Total GMV" value={fmt(summary.total.gmv.amount)} sub={`${summary.total.orders} orders`} />
            <StatCard
              label="Nohi-owned"
              value={fmt(summary.byKind.owned.gmv)}
              sub={`${summary.byKind.owned.orders} orders${summary.byKind.owned.channels && summary.byKind.owned.channels.length > 0 ? ' · ' + summary.byKind.owned.channels.join(', ') : ''}`}
              tone="emerald"
            />
            <StatCard
              label="Paid external"
              value={fmt(summary.byKind.paid.gmv)}
              sub={`${summary.byKind.paid.orders} orders${summary.byKind.paid.channels && summary.byKind.paid.channels.length > 0 ? ' · ' + summary.byKind.paid.channels.join(', ') : ''}`}
              tone="blue"
            />
            <StatCard
              label="Unattributed"
              value={fmt(summary.byKind.unattributed.gmv)}
              sub={`${summary.byKind.unattributed.orders} orders`}
              tone="muted"
            />
          </div>

          {Object.keys(summary.byChannel).length > 0 && (
            <div className="rounded-xl border border-border/40 bg-background overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/40 text-xs font-medium text-foreground">By channel</div>
              <div className="divide-y divide-border/30">
                {Object.entries(summary.byChannel).sort((a, b) => b[1].gmv - a[1].gmv).map(([id, ch]) => (
                  <div key={id} className="flex items-center px-4 py-2.5 text-xs">
                    <span className="w-32 font-medium text-foreground">{id}</span>
                    <span className="w-20 text-muted-foreground text-right">{ch.orders} orders</span>
                    <span className="w-28 text-foreground text-right">{fmt(ch.gmv)}</span>
                    <span className="w-28 text-muted-foreground text-right">AOV {fmt(ch.aov)}</span>
                    <span className="flex-1" />
                    <ChannelKindBadge id={id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'emerald' | 'blue' | 'muted' }): React.ReactElement {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      tone === 'emerald' ? 'border-emerald-300/40 bg-emerald-50/20' :
      tone === 'blue' ? 'border-blue-300/40 bg-blue-50/20' :
      tone === 'muted' ? 'border-border/40 bg-muted/10' :
      'border-border/40 bg-background',
    )}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
    </div>
  )
}

function ChannelKindBadge({ id }: { id: string }): React.ReactElement {
  const ownedSet = new Set(['nohi-skill', 'nohi-chatgpt-app', 'nohi-storefront', 'nohi-mcp'])
  const paidSet = new Set(['meta-feed', 'google-merchant', 'reddit-dpa', 'tiktok-shop'])
  const kind = ownedSet.has(id) ? 'owned' : paidSet.has(id) ? 'paid' : 'organic'
  return (
    <span className={cn(
      'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
      kind === 'owned' ? 'bg-emerald-500/15 text-emerald-700' :
      kind === 'paid' ? 'bg-blue-500/15 text-blue-700' :
      'bg-muted text-muted-foreground',
    )}>
      {kind}
    </span>
  )
}
