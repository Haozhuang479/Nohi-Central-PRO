import * as React from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from 'recharts'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
    icon?: React.ComponentType<{ className?: string }>
  }
>

interface ChartContextValue {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue>({ config: {} })

function useChart() {
  return React.useContext(ChartContext)
}

// ---------------------------------------------------------------------------
// ChartContainer
// ---------------------------------------------------------------------------

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactElement
}

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: ChartContainerProps) {
  // Build CSS custom properties from config so recharts can reference colours
  const cssVars = React.useMemo(() => {
    return Object.entries(config).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value.color) {
          acc[`--color-${key}`] = value.color
        }
        return acc
      },
      {}
    )
  }, [config])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        style={cssVars as React.CSSProperties}
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
          className
        )}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// ChartTooltip — re-export of recharts Tooltip, pre-configured
// ---------------------------------------------------------------------------

export const ChartTooltip = Tooltip

// ---------------------------------------------------------------------------
// ChartTooltipContent
// ---------------------------------------------------------------------------

interface ChartTooltipContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<TooltipProps<number, string>, 'active' | 'payload' | 'label'> {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
  labelKey?: string
  formatter?: (value: number, name: string, item: unknown, index: number) => React.ReactNode
  labelFormatter?: (label: unknown, payload: unknown[]) => React.ReactNode
}

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelKey,
      nameKey,
      formatter,
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload || !payload.length) {
      return null
    }

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload.length) return null
      const item = payload[0]
      const key = labelKey ?? (item.dataKey as string) ?? item.name ?? 'value'
      const itemConfig = config[key] ?? {}
      const displayLabel =
        labelFormatter
          ? labelFormatter(label, payload)
          : itemConfig.label ?? label

      return (
        <div className="font-medium text-foreground">{displayLabel}</div>
      )
    }, [hideLabel, label, labelFormatter, labelKey, payload, config])

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-xl border border-border/50 bg-background px-3 py-2 text-xs shadow-xl',
          className
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = nameKey ?? (item.dataKey as string) ?? item.name ?? 'value'
            const itemConfig = config[key] ?? {}
            const indicatorColor =
              (item.payload as Record<string, string>)?.fill ??
              item.color ??
              itemConfig.color

            return (
              <div
                key={item.dataKey}
                className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      'shrink-0 rounded-[2px]',
                      indicator === 'dot' && 'h-2.5 w-2.5 rounded-full mt-0.5',
                      indicator === 'line' && 'w-1 h-full rounded-full',
                      indicator === 'dashed' && 'w-0 border-l-2 border-dashed border-l-[var(--color-indicator)]'
                    )}
                    style={
                      {
                        '--color-indicator': indicatorColor,
                        backgroundColor:
                          indicator !== 'dashed' ? indicatorColor : undefined,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">
                    {itemConfig.label ?? item.name}
                  </span>
                  {item.value !== undefined && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatter
                        ? formatter(item.value as number, item.name as string, item, index)
                        : item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

// ---------------------------------------------------------------------------
// ChartLegend / ChartLegendContent
// ---------------------------------------------------------------------------

import {
  Legend,
  type LegendProps,
} from 'recharts'

export const ChartLegend = Legend

interface ChartLegendContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<LegendProps, 'payload' | 'verticalAlign'> {
  hideIcon?: boolean
  nameKey?: string
}

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(
  (
    { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload || !payload.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className
        )}
      >
        {payload.map((item) => {
          const key = nameKey ?? (item.dataKey as string) ?? item.value
          const itemConfig = config[key] ?? {}

          return (
            <div
              key={item.value}
              className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            >
              {itemConfig.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = 'ChartLegendContent'
