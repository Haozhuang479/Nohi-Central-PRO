"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// --- Data ---

const viewsData = [
  { month: "Sep", views: 420 },
  { month: "Oct", views: 680 },
  { month: "Nov", views: 910 },
  { month: "Dec", views: 1240 },
  { month: "Jan", views: 1580 },
  { month: "Feb", views: 2130 },
]

const ordersData = [
  { month: "Sep", orders: 8 },
  { month: "Oct", orders: 14 },
  { month: "Nov", orders: 22 },
  { month: "Dec", orders: 31 },
  { month: "Jan", orders: 38 },
  { month: "Feb", orders: 42 },
]

const conversionData = [
  { month: "Sep", rate: 1.9 },
  { month: "Oct", rate: 2.1 },
  { month: "Nov", rate: 2.4 },
  { month: "Dec", rate: 2.5 },
  { month: "Jan", rate: 2.4 },
  { month: "Feb", rate: 3.2 },
]

const projections = [
  { month: "Mar", projected: 2600, actual: null },
  { month: "Apr", projected: 3100, actual: null },
  { month: "May", projected: 3800, actual: null },
]

export default function AnalyticsPage() {
  const { language } = useLanguage()

  const trafficSources = [
    { name: language === "zh" ? "对话式店面" : "Conversational Storefront", value: 24, color: "#171717" },
    { name: "ChatGPT ACP", value: 22, color: "#404040" },
    { name: "ChatGPT App", value: 18, color: "#525252" },
    { name: "Gemini", value: 14, color: "#737373" },
    { name: "Google AI Mode", value: 12, color: "#a3a3a3" },
    { name: "Perplexity", value: 6, color: "#d4d4d4" },
    { name: language === "zh" ? "其他" : "Others", value: 4, color: "#e5e5e5" },
  ]

  const listingPerformance = [
    { name: language === "zh" ? "经典棉质T恤" : "Classic Cotton Tee", views: 842, favourites: 56, sales: 18 },
    { name: language === "zh" ? "有机亚麻长裤" : "Organic Linen Pants", views: 621, favourites: 43, sales: 14 },
    { name: language === "zh" ? "宽松卫衣" : "Relaxed Fit Hoodie", views: 518, favourites: 38, sales: 11 },
    { name: language === "zh" ? "简约托特包" : "Minimal Tote Bag", views: 392, favourites: 27, sales: 8 },
    { name: language === "zh" ? "美利奴羊毛围巾" : "Merino Wool Scarf", views: 284, favourites: 19, sales: 5 },
  ]

  const searchIntents = [
    { intent: language === "zh" ? "可持续基础款" : "sustainable basics", count: 186 },
    { intent: language === "zh" ? "极简时尚" : "minimalist fashion", count: 142 },
    { intent: language === "zh" ? "有机棉服装" : "organic cotton clothing", count: 98 },
    { intent: language === "zh" ? "百元以下礼物" : "gift under $100", count: 87 },
    { intent: language === "zh" ? "休闲办公装" : "casual workwear", count: 73 },
    { intent: language === "zh" ? "日常必备" : "everyday essentials", count: 64 },
    { intent: language === "zh" ? "环保服饰" : "eco-friendly apparel", count: 52 },
    { intent: language === "zh" ? "舒适家居服" : "comfortable loungewear", count: 41 },
  ]

  const customerDimensions = [
    { dimension: language === "zh" ? "年龄组" : "Age Group", segments: [
      { label: "18-24", pct: 22 },
      { label: "25-34", pct: 41 },
      { label: "35-44", pct: 24 },
      { label: "45+", pct: 13 },
    ]},
    { dimension: language === "zh" ? "购买类型" : "Purchase Type", segments: [
      { label: language === "zh" ? "首次" : "First Buy", pct: 58 },
      { label: language === "zh" ? "复购" : "Repeat", pct: 32 },
      { label: language === "zh" ? "礼品" : "Gift", pct: 10 },
    ]},
    { dimension: language === "zh" ? "地区" : "Region", segments: [
      { label: language === "zh" ? "美西" : "US West", pct: 35 },
      { label: language === "zh" ? "美东" : "US East", pct: 28 },
      { label: language === "zh" ? "加拿大" : "Canada", pct: 22 },
      { label: language === "zh" ? "其他" : "Other", pct: 15 },
    ]},
  ]

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {language === "zh" ? "数据分析" : "Analytics"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === "zh" ? "了解AI智能体如何与您的商品互动。" : "Insights into how AI agents interact with your listings."}
        </p>
      </div>

      {/* North Star Metrics */}
      <div className="rounded-2xl bg-secondary/50 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.06] p-6 flex items-center justify-center gap-8 flex-wrap">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {language === "zh" ? "已选池" : "Selected Pool"}
          </span>
          <span className="text-3xl font-semibold text-foreground tabular-nums">42</span>
          <span className="text-xs text-muted-foreground">
            {language === "zh" ? "个商品" : "products"}
          </span>
        </div>
        <div className="w-px h-12 bg-border" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {language === "zh" ? "测试池" : "Testing Pool"}
          </span>
          <span className="text-3xl font-semibold text-foreground tabular-nums">18</span>
          <span className="text-xs text-muted-foreground">
            {language === "zh" ? "个商品" : "products"}
          </span>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label={language === "zh" ? "总浏览量" : "Total Views"} 
          value="6,960" 
          change="+34.8%" 
          positive 
        />
        <MetricCard 
          label={language === "zh" ? "总订单数" : "Total Orders"} 
          value="155" 
          change="+10.5%" 
          positive 
        />
        <MetricCard 
          label={language === "zh" ? "转化率" : "Conversion Rate"} 
          value="3.2%" 
          change="+0.8%" 
          positive 
        />
        <MetricCard 
          label={language === "zh" ? "平均订单金额" : "Avg Order Value"} 
          value="$82.40" 
          change="+$4.20" 
          positive 
        />
      </div>

      {/* Charts Row: Views + Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Views Chart */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "浏览量" : "Views"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? "智能体购物者查看您商品的总次数。" : "Total times agent shoppers viewed your listings."}
            </p>
          </div>
          <ChartContainer
            config={{ views: { label: language === "zh" ? "浏览量" : "Views", color: "#171717" } }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="views" fill="#171717" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Orders Chart */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "订单数" : "Orders"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? "下单的总数量。" : "Total number of orders placed."}
            </p>
          </div>
          <ChartContainer
            config={{ orders: { label: language === "zh" ? "订单" : "Orders", color: "#171717" } }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="orders" stroke="#171717" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>

      {/* Conversion + Traffic Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conversion Rate */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "转化率" : "Conversion Rate"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? "完成购买的智能体购物者百分比。" : "Percentage of agent shoppers who made a purchase."}
            </p>
          </div>
          <ChartContainer
            config={{ rate: { label: language === "zh" ? "比率 %" : "Rate %", color: "#171717" } }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 5]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="rate" stroke="#171717" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Traffic Sources */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "流量来源" : "Traffic Sources"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? "您的智能体购物者来自哪里。" : "Where your agent shoppers come from."}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <ChartContainer
              config={{
                "Conversational Storefront": { label: language === "zh" ? "对话式店面" : "Conversational Storefront", color: "#171717" },
                "ChatGPT ACP": { label: "ChatGPT ACP", color: "#404040" },
                "ChatGPT App": { label: "ChatGPT App", color: "#525252" },
                Gemini: { label: "Gemini", color: "#737373" },
                "Google AI Mode": { label: "Google AI Mode", color: "#a3a3a3" },
                Perplexity: { label: "Perplexity", color: "#d4d4d4" },
                Others: { label: language === "zh" ? "其他" : "Others", color: "#e5e5e5" },
              }}
              className="h-[180px] w-[180px] shrink-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {trafficSources.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0]?.payload
                      if (!data) return null
                      return (
                        <div className="rounded-lg bg-secondary/50/50 bg-background px-3 py-2 text-xs shadow-xl">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="text-muted-foreground">{data.name}</span>
                            <span className="font-medium text-foreground tabular-nums ml-auto">{data.value}%</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-col gap-2">
              {trafficSources.map((source) => (
                <div key={source.name} className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="text-xs text-muted-foreground">{source.name}</span>
                  <span className="text-xs font-medium text-foreground ml-auto tabular-nums">
                    {source.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listing Performance */}
      <div className="rounded-2xl bg-secondary/50 bg-popover overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            {language === "zh" ? "商品表现" : "Listing Performance"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "zh" ? "哪些商品获得最多浏览、收藏和销量。" : "Which products get the most views, favourites, and sales."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">
                  {language === "zh" ? "商品" : "Product"}
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                  {language === "zh" ? "浏览" : "Views"}
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                  {language === "zh" ? "收藏" : "Favourites"}
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                  {language === "zh" ? "销量" : "Sales"}
                </th>
              </tr>
            </thead>
            <tbody>
              {listingPerformance.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{item.name}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{item.views.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{item.favourites}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{item.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search Intent + Customer Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search Intent */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "搜索意图" : "Search Intent"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? "购物者使用什么意图找到您的商品。" : "What intents shoppers used to find your listings."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {searchIntents.map((item) => {
              const maxCount = searchIntents[0].count
              const barWidth = (item.count / maxCount) * 100
              return (
                <div key={item.intent} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-40 truncate shrink-0">{item.intent}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/80 rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{item.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Customer Distribution */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "客户分布" : "Customer Distribution"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === "zh" ? "您客户群的多维度细分。" : "Multi-dimensional breakdown of your customer base."}
            </p>
          </div>
          {customerDimensions.map((dim) => (
            <div key={dim.dimension} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">{dim.dimension}</span>
              <div className="flex h-6 rounded-full overflow-hidden">
                {dim.segments.map((seg, idx) => {
                  const shades = ["#171717", "#525252", "#a3a3a3", "#d4d4d4"]
                  return (
                    <div
                      key={seg.label}
                      className="h-full flex items-center justify-center text-[10px] font-medium transition-all"
                      style={{
                        width: `${seg.pct}%`,
                        backgroundColor: shades[idx % shades.length],
                        color: idx < 2 ? "#fff" : "#171717",
                      }}
                      title={`${seg.label}: ${seg.pct}%`}
                    >
                      {seg.pct > 15 ? `${seg.label}` : ""}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {dim.segments.map((seg, idx) => {
                  const shades = ["#171717", "#525252", "#a3a3a3", "#d4d4d4"]
                  return (
                    <div key={seg.label} className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full" style={{ backgroundColor: shades[idx % shades.length] }} />
                      <span className="text-[11px] text-muted-foreground">
                        {seg.label} {seg.pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecasting */}
      <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">
              {language === "zh" ? "预测浏览量" : "Projected Views"}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {language === "zh" ? "预测" : "Forecast"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "zh" ? "基于当前增长轨迹的预估浏览量。" : "Estimated views based on current growth trajectory."}
          </p>
        </div>
        <ChartContainer
          config={{
            views: { label: language === "zh" ? "实际" : "Actual", color: "#171717" },
            projected: { label: language === "zh" ? "预测" : "Projected", color: "#a3a3a3" },
          }}
          className="h-[200px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                ...viewsData,
                ...projections.map((p) => ({ month: p.month, views: null, projected: p.projected })),
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="views" stroke="#171717" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="projected" stroke="#a3a3a3" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  change,
  positive,
}: {
  label: string
  value: string
  change: string
  positive: boolean
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 bg-popover p-5 flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-semibold text-foreground tabular-nums">{value}</span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          positive ? "text-foreground" : "text-destructive"
        )}
      >
        {change}
      </span>
    </div>
  )
}
