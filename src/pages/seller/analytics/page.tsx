
import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import {
  Bar, BarChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Cell, Pie, PieChart, Tooltip,
} from "recharts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Data ────────────────────────────────────────────────────────────────────

const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"]

const aiSessionsData = [
  { month: "Nov", sessions: 0 },
  { month: "Dec", sessions: 0 },
  { month: "Jan", sessions: 0 },
  { month: "Feb", sessions: 2 },
  { month: "Mar", sessions: 29 },
  { month: "Apr", sessions: 4 },
]

const ordersData = [
  { month: "Nov", orders: 0 },
  { month: "Dec", orders: 0 },
  { month: "Jan", orders: 0 },
  { month: "Feb", orders: 0.1 },
  { month: "Mar", orders: 2 },
  { month: "Apr", orders: 0 },
]

const conversionData = [
  { month: "Nov", rate: 0 },
  { month: "Dec", rate: 0 },
  { month: "Jan", rate: 0 },
  { month: "Feb", rate: 0 },
  { month: "Mar", rate: 6.7 },
  { month: "Apr", rate: 0 },
]

const trafficSources = [
  { name: "Others",  value: 50, color: "#171717" },
  { name: "ChatGPT", value: 44, color: "#737373" },
  { name: "Gemini",  value: 6,  color: "#d4d4d4" },
]

const listingPerformance = [
  { name: "Classic Cotton Tee",    views: 842, favourites: 56, sales: 18 },
  { name: "Organic Linen Pants",   views: 621, favourites: 43, sales: 14 },
  { name: "Relaxed Fit Hoodie",    views: 518, favourites: 38, sales: 11 },
  { name: "Minimal Tote Bag",      views: 392, favourites: 27, sales: 8  },
  { name: "Merino Wool Scarf",     views: 284, favourites: 19, sales: 5  },
]

// ─── Shared chart style ───────────────────────────────────────────────────────

const axisProps = {
  tick: { fontSize: 12, fill: "#737373" },
  axisLine: false as const,
  tickLine: false as const,
}

const gridProps = {
  strokeDasharray: "3 3" as const,
  vertical: false as const,
  stroke: "#e5e5e5",
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub,
  organic, paid,
}: {
  label: string
  value: string
  sub: string
  organic?: string
  paid?: string
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-5 flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-3xl font-bold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
      {(organic !== undefined || paid !== undefined) && (
        <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Organic</span>
            <span className="font-medium text-foreground tabular-nums">{organic ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Nohi</span>
            <span className="font-medium text-foreground tabular-nums">{paid ?? "—"}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ language }: { language: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="relative size-32 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-blue-50 dark:bg-blue-950/30" />
        <svg viewBox="0 0 120 100" className="relative size-28" fill="none">
          <circle cx="38" cy="52" r="24" stroke="#93c5fd" strokeWidth="10" fill="none" strokeDasharray="70 80" strokeLinecap="round" />
          <circle cx="38" cy="52" r="24" stroke="#f97316" strokeWidth="10" fill="none" strokeDasharray="30 120" strokeDashoffset="-70" strokeLinecap="round" />
          <rect x="68" y="62" width="8" height="22" rx="2" fill="#60a5fa" />
          <rect x="80" y="48" width="8" height="36" rx="2" fill="#34d399" />
          <rect x="92" y="38" width="8" height="46" rx="2" fill="#60a5fa" />
          <path d="M55 42 Q72 20 95 30" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M93 26 L95 30 L91 31" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="60" cy="18" r="2" fill="#fbbf24" />
          <circle cx="108" cy="42" r="1.5" fill="#f472b6" />
          <circle cx="20" cy="30" r="1.5" fill="#60a5fa" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-2 text-center max-w-sm">
        <p className="text-sm font-semibold text-foreground">
          {language === "zh" ? "欢迎使用数据分析" : "Welcome to Analytics"}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {language === "zh"
            ? "数据分析帮助您了解广告效果，为 Campaign 决策提供依据。目前暂无直播 Campaign，准备好后即可创建第一个。"
            : "Analytics lets you see and understand how your ads perform to make informed decisions on your campaigns. Right now, it's empty, as you don't have any live campaigns. If you're ready, create your first one right now."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" className="rounded-full px-6">
          {language === "zh" ? "了解更多" : "Learn more about Analytics"}
        </Button>
        <Button asChild className="rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white">
          <Link to="/seller/campaigns">
            {language === "zh" ? "查看 Campaign" : "View campaigns"}
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ─── Overview Tab ───────────────────────────────────────────────────────���─────

function OverviewTab({ language }: { language: string }) {
  return (
    <div className="flex flex-col gap-6">
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders"    value="2"    sub="No prior data" organic="1"    paid="1"    />
        <StatCard label="AI Sessions"     value="34"   sub="No prior data" organic="22"   paid="12"   />
        <StatCard label="Total Clicks"    value="3"    sub="No prior data" organic="2"    paid="1"    />
        <StatCard label="Conversion Rate" value="5.9%" sub="No prior data" organic="6.2%" paid="5.3%" />
      </div>

      {/* AI Sessions + Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="AI Sessions"
          desc={language === "zh" ? "每月 AI 推荐访问量" : "Monthly AI-referred visits to your store"}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aiSessionsData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} ticks={[0, 8, 16, 24, 32]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar dataKey="sessions" fill="#171717" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Orders"
          desc={language === "zh" ? "总订单数量" : "Total number of orders placed."}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ordersData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} ticks={[0, 0.5, 1, 1.5, 2]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }} />
              <Line type="monotone" dataKey="orders" stroke="#171717" strokeWidth={2} dot={{ r: 4, fill: "#171717", stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Conversion Rate + Traffic Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Conversion Rate"
          desc={language === "zh" ? "完成购买的购物者百分比。" : "Percentage of agent shoppers who made a purchase."}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={conversionData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} ticks={[0, 2, 4, 6, 8]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }} />
              <Line type="monotone" dataKey="rate" stroke="#171717" strokeWidth={2} dot={{ r: 4, fill: "#171717", stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Traffic Sources"
          desc={language === "zh" ? "揭示您的智能体渠道构成。" : "Reveal your agentic channel composition"}
        >
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90} endAngle={-270}
                >
                  {trafficSources.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3">
              {trafficSources.map((s) => (
                <div key={s.name} className="flex items-center gap-2.5 min-w-[120px]">
                  <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-foreground w-20">{s.name}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Revenue card */}
      <div className="rounded-2xl bg-secondary/50 p-6 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {language === "zh" ? "Nohi 收入" : "Nohi Revenue"}
        </h3>
        <span className="text-4xl font-bold text-foreground tabular-nums">$0</span>

      </div>

      {/* Listing performance */}
      <div className="rounded-2xl bg-secondary/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            {language === "zh" ? "商品表现" : "Listing Performance"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "zh" ? "浏览、收藏和销量最多的商品。" : "Which products get the most views, favourites, and sales."}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Product", "Views", "Favourites", "Sales"].map((h) => (
                <th key={h} className={cn("px-6 py-3 text-xs font-medium text-muted-foreground", h !== "Product" && "text-right")}>
                  {language === "zh" ? { Product: "商品", Views: "浏览", Favourites: "收藏", Sales: "销量" }[h] : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listingPerformance.map((item) => (
              <tr key={item.name} className="border-b border-border last:border-0 hover:bg-black/5 transition-colors">
                <td className="px-6 py-3.5 font-medium text-foreground">{item.name}</td>
                <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">{item.views.toLocaleString()}</td>
                <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">{item.favourites}</td>
                <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">{item.sales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

type DatePresetMode = "today" | "yesterday" | "last" | "period" | "bfcm" | "quarters" | "custom"

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"]

function formatDateLabel(d: Date) {
  return `${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isBetween(d: Date, start: Date, end: Date) {
  return d >= start && d <= end
}

function addMonths(date: Date, n: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  d.setDate(1)
  return d
}

function calendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay()
  const days: (number | null)[] = Array(first).fill(null)
  const total = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= total; i++) days.push(i)
  return days
}

function getLastNRange(n: number, unit: "Days" | "Weeks" | "Months", includeToday: boolean): [Date, Date] {
  const end = new Date(); if (!includeToday) { end.setDate(end.getDate() - 1) }
  const start = new Date(end)
  if (unit === "Days")   start.setDate(start.getDate() - n + (includeToday ? 1 : 0))
  if (unit === "Weeks")  start.setDate(start.getDate() - n * 7 + (includeToday ? 1 : 0))
  if (unit === "Months") start.setMonth(start.getMonth() - n); start.setDate(includeToday ? start.getDate() : start.getDate() + 1)
  return [start, end]
}

function getQuarterRange(label: string): [Date, Date] {
  const [q, y] = [label.slice(0,2), parseInt(label.slice(3))]
  const qMap: Record<string,number[]> = { Q1:[0,2], Q2:[3,5], Q3:[6,8], Q4:[9,11] }
  const [sm, em] = qMap[q] ?? [0, 2]
  return [new Date(y, sm, 1), new Date(y, em + 1, 0)]
}

function getBFCMRange(year: number): [Date, Date] {
  // Black Friday = 4th Thursday of November
  const nov1 = new Date(year, 10, 1)
  const day1 = nov1.getDay()
  const firstThur = day1 <= 4 ? 5 - day1 : 12 - day1
  const bfDay = firstThur + 21
  const bf = new Date(year, 10, bfDay)
  const cm = new Date(year, 10, bfDay + 3)
  return [bf, cm]
}

interface DateRangePickerProps {
  label: string
  onApply: (label: string) => void
}

function DateRangePicker({ label, onApply }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DatePresetMode>("last")
  const [subMode, setSubMode] = useState<string | null>(null)

  // "Last N" state
  const [lastN, setLastN] = useState(30)
  const [lastUnit, setLastUnit] = useState<"Days"|"Weeks"|"Months">("Days")
  const [includeToday, setIncludeToday] = useState(true)

  // Calendar navigation
  const today = new Date()
  const [leftMonth, setLeftMonth] = useState(new Date(today.getFullYear(), today.getMonth() - 1, 1))

  // Selected range
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [hovered, setHovered] = useState<Date | null>(null)
  const [appliedLabel, setAppliedLabel] = useState(label)

  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const rightMonth = addMonths(leftMonth, 1)

  function applyPreset(start: Date, end: Date, displayLabel: string) {
    setRangeStart(start); setRangeEnd(end)
    setAppliedLabel(displayLabel); onApply(displayLabel); setOpen(false)
  }

  function handleDayClick(day: Date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day); setRangeEnd(null)
    } else {
      if (day < rangeStart) { setRangeStart(day); setRangeEnd(rangeStart) }
      else { setRangeEnd(day) }
    }
  }

  function handleApply() {
    if (mode === "last") {
      const [s, e] = getLastNRange(lastN, lastUnit, includeToday)
      applyPreset(s, e, `Last ${lastN} ${lastUnit}`)
    } else if (rangeStart && rangeEnd) {
      applyPreset(rangeStart, rangeEnd, `${formatDateLabel(rangeStart)} – ${formatDateLabel(rangeEnd)}`)
    }
  }

  function renderCalendar(year: number, month: number) {
    const days = calendarDays(year, month)
    const effectiveEnd = rangeEnd ?? hovered
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <div className="text-center font-semibold text-sm">{MONTH_NAMES[month]} {year}</div>
        <div className="grid grid-cols-7 gap-y-1">
          {DAY_HEADERS.map(h => <div key={h} className="text-center text-[11px] text-muted-foreground py-1">{h}</div>)}
          {days.map((d, i) => {
            if (d === null) return <div key={`e-${i}`} />
            const date = new Date(year, month, d)
            const isStart = rangeStart && isSameDay(date, rangeStart)
            const isEnd   = rangeEnd   && isSameDay(date, rangeEnd)
            const inRange = rangeStart && effectiveEnd && !isStart && !isEnd && isBetween(date, rangeStart, effectiveEnd)
            const isToday = isSameDay(date, today)
            const isFuture = date > today
            return (
              <button
                key={d}
                type="button"
                disabled={isFuture}
                onClick={() => handleDayClick(date)}
                onMouseEnter={() => { if (rangeStart && !rangeEnd) setHovered(date) }}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-full transition-colors",
                  isFuture && "text-muted-foreground/30 cursor-not-allowed",
                  !isFuture && "hover:bg-secondary",
                  (isStart || isEnd) && "bg-foreground text-background font-semibold",
                  inRange && "bg-secondary rounded-none",
                  isToday && !isStart && !isEnd && "font-bold"
                )}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const QUARTER_OPTIONS = ["Q1 2026","Q4 2025","Q3 2025","Q2 2025"]
  const BFCM_OPTIONS    = ["BFCM 2025","BFCM 2024","BFCM 2023","BFCM 2022"]
  const PERIOD_OPTIONS  = ["Week to date","Month to date","Quarter to date","Year to date"]

  function renderLeftPanel() {
    if (subMode === "bfcm") return (
      <div className="flex flex-col w-44">
        <button type="button" onClick={() => setSubMode(null)} className="flex items-center gap-1 text-sm font-semibold mb-3 hover:text-foreground">
          <ChevronLeft className="size-4" /> BFCM
        </button>
        {BFCM_OPTIONS.map(opt => {
          const year = parseInt(opt.split(" ")[1])
          return (
            <button key={opt} type="button" onClick={() => { const [s,e] = getBFCMRange(year); applyPreset(s,e,opt) }}
              className="text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary">
              {opt}
            </button>
          )
        })}
      </div>
    )
    if (subMode === "quarters") return (
      <div className="flex flex-col w-44">
        <button type="button" onClick={() => setSubMode(null)} className="flex items-center gap-1 text-sm font-semibold mb-3 hover:text-foreground">
          <ChevronLeft className="size-4" /> Quarters
        </button>
        {QUARTER_OPTIONS.map(opt => (
          <button key={opt} type="button" onClick={() => { const [s,e] = getQuarterRange(opt); applyPreset(s,e,opt) }}
            className="text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary">
            {opt}
          </button>
        ))}
      </div>
    )
    if (subMode === "period") return (
      <div className="flex flex-col w-44">
        <button type="button" onClick={() => setSubMode(null)} className="flex items-center gap-1 text-sm font-semibold mb-3 hover:text-foreground">
          <ChevronLeft className="size-4" /> Period to date
        </button>
        {PERIOD_OPTIONS.map(opt => {
          function getRange(): [Date,Date] {
            const now = new Date()
            if (opt === "Week to date")    { const s = new Date(now); s.setDate(now.getDate()-now.getDay()); return [s,now] }
            if (opt === "Month to date")   { return [new Date(now.getFullYear(),now.getMonth(),1), now] }
            if (opt === "Quarter to date") { const qm = Math.floor(now.getMonth()/3)*3; return [new Date(now.getFullYear(),qm,1),now] }
            return [new Date(now.getFullYear(),0,1), now]
          }
          return (
            <button key={opt} type="button" onClick={() => { const [s,e] = getRange(); applyPreset(s,e,opt) }}
              className="text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary">
              {opt}
            </button>
          )
        })}
      </div>
    )

    const presets: { id: DatePresetMode; label: string; sub?: string }[] = [
      { id: "today",     label: "Today" },
      { id: "yesterday", label: "Yesterday" },
      { id: "last",      label: "Last" },
      { id: "period",    label: "Period to date", sub: "period" },
      { id: "bfcm",      label: "Black Friday Cyber Monday", sub: "bfcm" },
      { id: "quarters",  label: "Quarters", sub: "quarters" },
      { id: "custom",    label: "Custom range" },
    ]
    return (
      <div className="flex flex-col w-44">
        {presets.map(p => (
          <button key={p.id} type="button"
            onClick={() => {
              if (p.sub) { setSubMode(p.sub); setMode(p.id) }
              else if (p.id === "today") {
                applyPreset(today, today, "Today")
              } else if (p.id === "yesterday") {
                const y = new Date(today); y.setDate(today.getDate()-1); applyPreset(y,y,"Yesterday")
              } else {
                setMode(p.id); setSubMode(null)
              }
            }}
            className={cn(
              "flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm",
              mode === p.id && !subMode ? "bg-secondary font-medium" : "hover:bg-secondary"
            )}
          >
            {p.label}
            {p.sub && <ChevronRight className="size-3.5 text-muted-foreground" />}
          </button>
        ))}
      </div>
    )
  }

  function renderRightPanel() {
    if (mode === "last") return (
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Last</span>
          <input type="number" min={1} max={365} value={lastN}
            onChange={e => setLastN(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" />
          <select value={lastUnit} onChange={e => setLastUnit(e.target.value as any)}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none appearance-none pr-8">
            {["Days","Weeks","Months"].map(u => <option key={u}>{u}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={includeToday} onChange={e => setIncludeToday(e.target.checked)}
              className="rounded accent-foreground" />
            Include today
          </label>
        </div>
        <div className="flex gap-8">
          {renderCalendar(leftMonth.getFullYear(), leftMonth.getMonth())}
          {renderCalendar(rightMonth.getFullYear(), rightMonth.getMonth())}
        </div>
        {rangeStart && rangeEnd && (
          <div className="text-sm text-muted-foreground">{formatDateLabel(rangeStart)} – {formatDateLabel(rangeEnd)}</div>
        )}
      </div>
    )
    return (
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-3">
          <input placeholder="YYYY-MM-DD" value={rangeStart ? rangeStart.toISOString().slice(0,10) : ""}
            readOnly className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none" />
          <span className="text-muted-foreground">→</span>
          <input placeholder="YYYY-MM-DD" value={rangeEnd ? rangeEnd.toISOString().slice(0,10) : ""}
            readOnly className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none" />
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setLeftMonth(prev => addMonths(prev, -1))} className="p-1 hover:bg-secondary rounded-lg"><ChevronLeft className="size-4" /></button>
          <div className="flex gap-8 flex-1 justify-center">
            {renderCalendar(leftMonth.getFullYear(), leftMonth.getMonth())}
            {renderCalendar(rightMonth.getFullYear(), rightMonth.getMonth())}
          </div>
          <button type="button" onClick={() => setLeftMonth(prev => addMonths(prev, 1))} className="p-1 hover:bg-secondary rounded-lg"><ChevronRight className="size-4" /></button>
        </div>
        {rangeStart && rangeEnd && (
          <div className="text-sm text-muted-foreground">{formatDateLabel(rangeStart)} – {formatDateLabel(rangeEnd)}</div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
      >
        <CalendarDays className="size-4 text-muted-foreground" />
        {appliedLabel}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-background border border-border rounded-2xl shadow-xl p-5 flex flex-col gap-4 min-w-[680px]">
          <div className="flex gap-6">
            {renderLeftPanel()}
            <div className="w-px bg-border" />
            {renderRightPanel()}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              {rangeStart && rangeEnd
                ? `${formatDateLabel(rangeStart)} – ${formatDateLabel(rangeEnd)}`
                : "Select a date range"}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-secondary">Cancel</button>
              <button type="button" onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "overview"

export default function AnalyticsPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [dateLabel, setDateLabel] = useState("Last 30 days")
  const tabs: { id: Tab; label: string; labelZh: string }[] = [
    { id: "overview", label: "Overview", labelZh: "概览" },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-0 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === "zh" ? "数据分析" : "Analytics"}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => window.print()}
          >
            <Download className="size-4" />
            {language === "zh" ? "导出报告" : "Export report"}
          </Button>
          <DateRangePicker label={dateLabel} onApply={setDateLabel} />
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0 border-b border-border mt-4 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {language === "zh" ? tab.labelZh : tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex flex-col gap-5 px-6 py-6 max-w-6xl w-full mx-auto">
        {activeTab === "overview" && <OverviewTab language={language} />}
      </div>
    </div>
  )
}
