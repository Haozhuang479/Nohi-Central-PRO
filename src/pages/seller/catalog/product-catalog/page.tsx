
import React, { useState, useMemo, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"
import {
  Info,
  Circle,
  CheckCircle2,
  Download,
  Search,
  Flag,
  Package,
  Bell,
  Eye,
  EyeOff,
  ExternalLink,
  TrendingUp,
  X,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ─── Onboarding Banner ───────────────────────────────────────────────────────

function OnboardingBanner() {
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="flex items-center justify-between gap-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900 px-6 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
        <Info className="size-4 shrink-0" />
        <span>{t("productCatalog.onboardingBanner")}</span>
      </div>
      <Link
        href="/seller/onboarding"
        className="shrink-0 font-semibold text-blue-800 dark:text-blue-300 underline hover:opacity-70 transition-opacity whitespace-nowrap"
      >
        {t("productCatalog.goToOnboarding")}
      </Link>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
        enabled ? "bg-foreground" : "bg-border"
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 transform rounded-full bg-background transition-transform",
          enabled ? "translate-x-4" : "translate-x-1"
        )}
      />
    </button>
  )
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const productData = [
  {
    id: "p1",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-KfnKqfLwIh7yo93owx2UcZwolOgIku.png",
    name: "Europe Double Layered Zircon Hoop Earrings For Women Gold Silver Color Personality Punk Earring Party Jewelry Gifts - 01 Gold Color / 2pcs",
    displayable: true,
    description:
      "SPECIFICATIONS Stand out with these daring double-layered hoop earrings crafted from a striking blend of Tibetan silver and copper. Featuring sparkling zircon accents, their bold design combines punk edge with elegant flair, perfect for making a st...",
    url: "https://tvep6e-s6.myshopify.com/products/europe-double-layered-zircon-hoop-earrings-for-women-gold-silver-color-personality-punk-earring-party-jewelry-gifts?variant=50618109591894",
    price: "$7.15",
    retailPrice: "--",
    brand: "Venvia",
    stock: null,
  },
  {
    id: "p2",
    image: null,
    name: "Minimalist Gold Chain Necklace - Dainty Layered Pendant",
    displayable: true,
    description: "A sleek, minimalist necklace crafted from 18k gold-plated brass with a delicate pendant charm. Perfect for everyday wear or special occasions.",
    url: "https://tvep6e-s6.myshopify.com/products/minimalist-gold-chain-necklace",
    price: "$12.50",
    retailPrice: "$15.00",
    brand: "Venvia",
    stock: 84,
  },
  {
    id: "p3",
    image: null,
    name: "Crystal Butterfly Hair Clip Set - 4 Pack Pastel Colors",
    displayable: false,
    description: "Set of 4 butterfly hair clips featuring iridescent crystal embellishments. Lightweight and comfortable for all hair types.",
    url: "https://tvep6e-s6.myshopify.com/products/crystal-butterfly-hair-clip-set",
    price: "$4.99",
    retailPrice: "$8.00",
    brand: "Venvia",
    stock: 231,
  },
]

// ─── Chart helpers ────────────────────────────────────────────────────────────

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const globalStatsData = [
  { date: "4/13/26", displayable: 41, notDisplayable: 1 },
]

const productDetailsData = [
  { date: "4/13/26", withoutGoogleCategory: 42 },
]

const DONUT_DATA = [
  { value: 0 },
  { value: 100 },
]

function GlobalStatsChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={globalStatsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} />
        <ReTooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--popover)" }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Line type="monotone" dataKey="displayable" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} name="Displayable" />
        <Line type="monotone" dataKey="notDisplayable" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: "#f97316" }} name="Not displayable" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ProductDetailsChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={productDetailsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} />
        <ReTooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--popover)" }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(value: number, name: string) => [value, name]}
          labelFormatter={(label, payload) => {
            const feedId = "457546"
            return `${label}\nFeed ID: ${feedId}`
          }}
        />
        <Line type="monotone" dataKey="withoutGoogleCategory" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }} name="Without Google Category" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function DonutChart() {
  return (
    <div className="relative flex items-center justify-center" style={{ height: 200 }}>
      <PieChart width={180} height={180}>
        <Pie
          data={DONUT_DATA}
          cx={85}
          cy={85}
          innerRadius={60}
          outerRadius={80}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          strokeWidth={0}
        >
          <Cell fill="hsl(var(--muted))" />
          <Cell fill="hsl(var(--muted)/0.2)" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-semibold text-foreground">0%</span>
      </div>
    </div>
  )
}

// ─── Overview Tab ���────────────────────────────────────────────────────────────

function OverviewTab({ onGoToUGC }: { onGoToUGC: () => void }) {
  const { t, language } = useLanguage()
  const zh = language === "zh"

  const totalProducts = productData.length
  const totalVariants = totalProducts * 6
  const liveCount = productData.filter((p) => p.displayable).length

  return (
    <div className="flex flex-col gap-8">
      {/* Catalog stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-secondary/50 p-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{zh ? "商品" : "Products"}</span>
          <span className="text-3xl font-bold tabular-nums text-foreground">{totalProducts}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="rounded-2xl bg-secondary/50 p-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{zh ? "Feed 变体" : "Feed Variants"}</span>
          <span className="text-3xl font-bold tabular-nums text-foreground">{totalVariants}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="rounded-2xl bg-secondary/50 p-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{zh ? "Live" : "Live"}</span>
          <span className="text-3xl font-bold tabular-nums text-foreground">{liveCount}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
      </div>

      {/* Your dashboard */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">{t("productCatalog.yourDashboard")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Performance insights */}
          <div className="rounded-xl bg-popover p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-foreground">{t("productCatalog.performanceInsights")}</p>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">{t("productCatalog.insightTip")}</p>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs text-muted-foreground">{t("productCatalog.insightTipStatus")}</p>
              </div>
            </div>
            <div className="mt-auto flex items-center gap-2">
              <Button size="sm" className="rounded-full text-xs" onClick={onGoToUGC}>
                {t("productCatalog.seeAll")}
              </Button>
            </div>
          </div>

          {/* Feed status */}
          <div className="rounded-xl bg-popover p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("productCatalog.feedStatus")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("productCatalog.feedStatusDesc")}</p>
            </div>
            <div className="flex items-center gap-3 mt-auto">
              <Circle className="size-8 text-yellow-400 shrink-0" strokeWidth={2.5} />
              <p className="text-sm text-foreground">{t("productCatalog.noScheduledImport")}</p>
            </div>
          </div>

          {/* Action needed */}
          <div className="rounded-xl bg-popover p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("productCatalog.actionNeeded")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("productCatalog.actionNeededDesc")}</p>
            </div>
            <div className="flex items-center gap-3 mt-auto">
              <CheckCircle2 className="size-8 text-green-500 shrink-0" />
              <p className="text-sm text-foreground">{t("productCatalog.noIssues")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Products Empty State ─────────────────────────────────────────────────────

function ProductsEmptyState({ onConnectFeed }: { onConnectFeed: () => void }) {
  const { t, language } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <div className="size-16 rounded-2xl bg-secondary flex items-center justify-center">
        <Package className="size-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">
          {language === "zh" ? "尚未导入任何商品" : "No products imported yet"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {language === "zh"
            ? "通过连接 Feed 将您的产品导入至 Nohi Agentic 目录。"
            : "Import your products into the Nohi Agentic Catalog by connecting a feed."}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button onClick={onConnectFeed} className="rounded-full gap-2 min-w-[160px]">
          <LinkIcon className="size-4" />
          {language === "zh" ? "连接 Feed" : "Connect Feed"}
        </Button>
      </div>
    </div>
  )
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ onConnectFeed }: { onConnectFeed: () => void }) {
  const { t } = useLanguage()
  const [subTab, setSubTab] = useState<"displayable" | "blocked" | "unblock">("displayable")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const hasProducts = productData.length > 0

  const displayable = productData.filter((p) => p.displayable)
  const blocked = productData.filter((p) => !p.displayable)

  const subTabs = [
    { id: "displayable" as const, label: `${t("productCatalog.displayable")} ${displayable.length}` },
    { id: "blocked" as const, label: `${t("productCatalog.blocked")} ${blocked.length}` },
    { id: "unblock" as const, label: `${t("productCatalog.unblockReq")} 0` },
  ]

  const rows = subTab === "displayable" ? displayable : subTab === "blocked" ? blocked : []

  const toggleAll = () => {
    if (selected.length === rows.length) setSelected([])
    else setSelected(rows.map((r) => r.id))
  }
  const toggleOne = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  if (!hasProducts) {
    return <ProductsEmptyState onConnectFeed={onConnectFeed} />
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-border">
        {subTabs.map((st) => (
          <button
            key={st.id}
            onClick={() => setSubTab(st.id)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              subTab === st.id
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div>
        <h3 className="text-base font-semibold text-foreground">{t("productCatalog.listOfLive")}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{t("productCatalog.listDesc")}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("productCatalog.searchPlaceholder")}
          className="w-full bg-popover border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="h-px bg-border" />

      {/* Products table */}
      <div className="rounded-xl bg-popover overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.length === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              {[
                "productCatalog.colImage",
                "productCatalog.colProductId",
                "productCatalog.colTitle",
                "productCatalog.colDisplayable",
                "productCatalog.colShortDesc",
                "productCatalog.colDescription",
                "productCatalog.colBrand",
                "productCatalog.colProductType",
                "productCatalog.colCategory",
                "productCatalog.colProductUrl",
                "productCatalog.colVariantPrice",
                "productCatalog.colCompareAtPrice",
                "productCatalog.colStock",
                "productCatalog.colStatus",
                "productCatalog.colVisibility",
                "productCatalog.colSku",
                "productCatalog.colBarcode",
                "productCatalog.colWeight",
                "productCatalog.colMaterial",
                "productCatalog.colTags",
              ].map((k) => (
                <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-foreground whitespace-nowrap">
                  {t(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(product.id)}
                    onChange={() => toggleOne(product.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="size-14 object-cover rounded-md border border-border"
                    />
                  ) : (
                    <div className="size-14 rounded-md border border-border bg-secondary flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">—</span>
                    </div>
                  )}
                </td>
                {/* title */}
                <td className="px-4 py-4 max-w-[180px]">
                  <p className="text-xs text-foreground leading-relaxed">{product.name}</p>
                </td>
                {/* displayable */}
                <td className="px-4 py-4">
                  {product.displayable ? (
                    <CheckCircle2 className="size-5 text-green-500" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                </td>
                {/* short_description */}
                <td className="px-4 py-4 max-w-[160px]">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">—</p>
                </td>
                {/* description */}
                <td className="px-4 py-4 max-w-[220px]">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{product.description}</p>
                </td>
                {/* brand */}
                <td className="px-4 py-4 text-xs text-foreground whitespace-nowrap">{product.brand}</td>
                {/* product_type */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* category */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* product_url */}
                <td className="px-4 py-4 max-w-[180px]">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 underline break-all leading-relaxed"
                  >
                    {product.url}
                  </a>
                </td>
                {/* variant_price */}
                <td className="px-4 py-4 text-xs text-foreground tabular-nums whitespace-nowrap">{product.price}</td>
                {/* variant_compare_at_price */}
                <td className="px-4 py-4 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {product.retailPrice}
                </td>
                {/* inventory_quantity */}
                <td className="px-4 py-4 text-xs text-foreground tabular-nums whitespace-nowrap">
                  {product.stock !== null ? product.stock : "—"}
                </td>
                {/* status */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* catalog_visibility */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* variant_sku */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* variant_barcode */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* weight */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* material */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
                {/* tags */}
                <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Feeds Empty State ────────────────────────────────────────────────────────

function FeedsEmptyState({ onConnectFeed }: { onConnectFeed: () => void }) {
  const { language } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <div className="size-16 rounded-2xl bg-secondary flex items-center justify-center">
        <LinkIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">
          {language === "zh" ? "尚未连接任何 Feed" : "No feeds connected yet"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {language === "zh"
            ? "连接您的商品 Feed，将商品同步至 Nohi Agentic 目录。"
            : "Connect your product feed to sync products into the Nohi Agentic Catalog."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onConnectFeed} className="rounded-full gap-2 min-w-[160px]">
          <LinkIcon className="size-4" />
          {language === "zh" ? "连接 Feed" : "Connect Feed"}
        </Button>
      </div>
    </div>
  )
}

// ─── UGC & Reviews Tab ───────────────────────────────────────────────────────

type PlatformKey = "instagram" | "tiktok" | "youtube" | "pinterest" | "twitter" | "reddit" | "rednote" | "reviews" | "other"
type ItemStatus = "approved" | "pending" | "rejected"
type Sentiment = "positive" | "neutral" | "negative"

interface PlatformItem {
  id: string
  title: string
  url: string
  author?: string
  publishedAt: string
  likes?: number
  comments?: number
  rating?: number
  verified?: boolean
  sentiment?: Sentiment
  themes?: string[]
  status: ItemStatus
  agentAvailable: boolean
  product?: string
  category?: string
}

interface PlatformData {
  key: PlatformKey
  connected: boolean
  lastSyncedDisplay?: string
  links: string[]
  items: PlatformItem[]
}

interface PlatformMeta {
  key: PlatformKey
  label: string
  short: string
  color: string
}

const PLATFORM_META: PlatformMeta[] = [
  { key: "instagram", label: "Instagram",        short: "IG", color: "bg-pink-500"   },
  { key: "tiktok",    label: "TikTok",           short: "TT", color: "bg-black"      },
  { key: "youtube",   label: "YouTube",          short: "YT", color: "bg-red-600"    },
  { key: "pinterest", label: "Pinterest",        short: "P",  color: "bg-red-500"    },
  { key: "twitter",   label: "X (Twitter)",      short: "X",  color: "bg-black"      },
  { key: "reddit",    label: "Reddit",           short: "R",  color: "bg-orange-600" },
  { key: "rednote",   label: "Rednote",          short: "小", color: "bg-red-500"    },
  { key: "reviews",   label: "Verified Reviews", short: "★",  color: "bg-amber-500"  },
  { key: "other",     label: "Other UGC",        short: "U",  color: "bg-slate-500"  },
]

function ugcUid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function formatNumber(value?: number) {
  if (!value) return "—"
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

const MOCK_PLATFORMS: PlatformData[] = [
  {
    key: "instagram",
    connected: true,
    lastSyncedDisplay: "2h ago",
    links: ["https://instagram.com/brand.official"],
    items: [
      { id: ugcUid("ig"), title: "Sunday slow mornings with our new linen set ✨", url: "https://instagram.com/p/example-1", author: "@brand.official", publishedAt: "3d ago", likes: 1240, comments: 87, sentiment: "positive", themes: ["design", "quality"], status: "approved", agentAvailable: true },
      { id: ugcUid("ig"), title: "Customer unboxing by @lila.reads", url: "https://instagram.com/p/example-2", author: "@lila.reads", publishedAt: "5d ago", likes: 430, comments: 22, sentiment: "positive", themes: ["ugc", "unboxing"], status: "pending", agentAvailable: false },
    ],
  },
  {
    key: "tiktok",
    connected: true,
    lastSyncedDisplay: "1d ago",
    links: ["https://tiktok.com/@brand"],
    items: [
      { id: ugcUid("tt"), title: "How I style 3 essentials for a week", url: "https://tiktok.com/@brand/video/example", author: "@brand", publishedAt: "4d ago", likes: 8900, comments: 210, sentiment: "positive", themes: ["styling", "utility"], status: "approved", agentAvailable: true },
    ],
  },
  {
    key: "reviews",
    connected: true,
    lastSyncedDisplay: "6h ago",
    links: ["https://reviews.example.com/store/brand"],
    items: [
      { id: ugcUid("rv"), title: "Beautiful quality and the fit is exactly what I wanted.", url: "#", author: "Verified buyer", publishedAt: "2d ago", rating: 5, verified: true, sentiment: "positive", themes: ["quality", "fit"], status: "approved", agentAvailable: true, product: "Linen Set", category: "Apparel" },
      { id: ugcUid("rv"), title: "Loved the fabric, but shipping felt slower than expected.", url: "#", author: "Verified buyer", publishedAt: "5d ago", rating: 3, verified: true, sentiment: "negative", themes: ["shipping"], status: "approved", agentAvailable: true, product: "Summer Shirt", category: "Apparel" },
      { id: ugcUid("rv"), title: "Sizing ran slightly small for me.", url: "#", author: "Verified buyer", publishedAt: "1w ago", rating: 3, verified: true, sentiment: "negative", themes: ["sizing"], status: "pending", agentAvailable: false, product: "Everyday Tank", category: "Apparel" },
    ],
  },
  { key: "other", connected: false, links: [], items: [] },
]

interface LinkEditorPanelProps {
  connected: boolean
  draftLinks: string[]
  newLinkInput: string
  onNewLinkChange: (v: string) => void
  onAdd: () => void
  onRemove: (idx: number) => void
  onCancel: () => void
  onSave: () => void
  showFileUpload?: boolean
  zh: boolean
}

function LinkEditorPanel({ connected, draftLinks, newLinkInput, onNewLinkChange, onAdd, onRemove, onCancel, onSave, showFileUpload, zh }: LinkEditorPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)])
    e.target.value = ""
  }

  return (
    <div className="rounded-b-2xl border border-t-0 border-foreground bg-background p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-foreground">
        {connected ? (zh ? "修改来源" : "Update sources") : (zh ? "添加来源" : "Add sources")}
      </p>

      {/* Existing draft links */}
      {draftLinks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {draftLinks.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
              <span className="flex-1 truncate text-xs text-foreground">{link}</span>
              <button type="button" onClick={() => onRemove(idx)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files */}
      {showFileUpload && uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {uploadedFiles.map((name, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
              <span className="flex-1 truncate text-xs text-foreground">{name}</span>
              <button type="button" onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={newLinkInput}
          onChange={(e) => onNewLinkChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd() } }}
          placeholder={zh ? "粘贴链接…" : "Paste a URL…"}
          className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        <button type="button" onClick={onAdd} className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors">
          {zh ? "添加" : "Add"}
        </button>
      </div>

      {/* File upload (Reviews only) */}
      {showFileUpload && (
        <div>
          <input ref={fileInputRef} type="file" multiple accept=".csv,.json,.xlsx,.pdf" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-secondary transition-colors text-center"
          >
            {zh ? "上传文件（CSV / JSON / XLSX）" : "Upload file (CSV / JSON / XLSX)"}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {zh ? "取消" : "Cancel"}
        </button>
        <button type="button" onClick={onSave} className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity">
          {zh ? "保存" : "Save"}
        </button>
      </div>
    </div>
  )
}

function UGCReviewsTab() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [platforms, setPlatforms] = useState<PlatformData[]>(() => JSON.parse(JSON.stringify(MOCK_PLATFORMS)))
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("reviews")
  const [autoSync, setAutoSync] = useState(true)
  const [syncFrequency, setSyncFrequency] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [negativeThemeFilter, setNegativeThemeFilter] = useState<string | null>(null)

  // Link editor panel state
  const [linkEditorKey, setLinkEditorKey] = useState<PlatformKey | null>(null)
  const [draftLinks, setDraftLinks] = useState<string[]>([])
  const [newLinkInput, setNewLinkInput] = useState("")

  function openLinkEditor(key: PlatformKey) {
    const existing = platforms.find((p) => p.key === key)?.links ?? []
    setDraftLinks([...existing])
    setNewLinkInput("")
    setLinkEditorKey(key)
  }

  function closeLinkEditor() {
    setLinkEditorKey(null)
    setDraftLinks([])
    setNewLinkInput("")
  }

  function addDraftLink() {
    const url = newLinkInput.trim()
    if (!url) return
    setDraftLinks((prev) => [...prev, url])
    setNewLinkInput("")
  }

  function removeDraftLink(idx: number) {
    setDraftLinks((prev) => prev.filter((_, i) => i !== idx))
  }

  function saveDraftLinks() {
    if (!linkEditorKey) return
    setPlatforms((prev) =>
      prev.map((p) =>
        p.key !== linkEditorKey
          ? p
          : { ...p, links: draftLinks, connected: draftLinks.length > 0, lastSyncedDisplay: draftLinks.length > 0 ? (zh ? "刚刚" : "just now") : undefined }
      )
    )
    closeLinkEditor()
  }

  const activePlatformData = useMemo(
    () => platforms.find((p) => p.key === activePlatform) ?? platforms[0],
    [activePlatform, platforms]
  )

  const reviewItems = useMemo(() => platforms.find((p) => p.key === "reviews")?.items ?? [], [platforms])

  const negativeThemes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of reviewItems) {
      if (item.sentiment !== "negative") continue
      for (const theme of item.themes ?? []) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [reviewItems])

  const mutatePlatformItem = useCallback((platformKey: PlatformKey, itemId: string, patch: Partial<PlatformItem>) => {
    setPlatforms((prev) =>
      prev.map((p) =>
        p.key !== platformKey ? p : { ...p, items: p.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }
      )
    )
  }, [])

  const syncNow = () => {
    const newReview: PlatformItem = {
      id: ugcUid("rv"),
      title: zh ? "面料很舒服，包装也很细致。" : "Fabric feels premium and the packaging was thoughtful.",
      url: "#",
      author: zh ? "已验证买家" : "Verified buyer",
      publishedAt: zh ? "刚刚" : "just now",
      rating: 5,
      verified: true,
      sentiment: "positive",
      themes: ["quality", "packaging"],
      status: "pending",
      agentAvailable: false,
      product: "Core Set",
      category: "Apparel",
    }
    setPlatforms((prev) =>
      prev.map((p) =>
        p.key === "reviews" ? { ...p, lastSyncedDisplay: zh ? "刚刚" : "just now", items: [newReview, ...p.items] } : p
      )
    )
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Platform selector */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{zh ? "已连接内容源" : "Connected Sources"}</h2>
        <p className="text-sm text-muted-foreground -mt-1">{zh ? "决定 agent 可以引用什么，以及哪些内容还要审核。" : "Choose what the agent can cite, and what still needs review."}</p>
        <div className="flex gap-3 items-start">
          {/* Reviews card — full-height left column */}
          {(() => {
            const meta = PLATFORM_META.find((m) => m.key === "reviews")!
            const platform = platforms.find((p) => p.key === "reviews")
            const connected = Boolean(platform?.connected)
            const total = platform?.items.length ?? 0
            const approved = platform?.items.filter((item) => item.status === "approved" && item.agentAvailable).length ?? 0
            const isEditing = linkEditorKey === "reviews"
            return (
              <div className="flex flex-col gap-0 w-56 shrink-0 self-stretch">
                <button
                  type="button"
                  onClick={() => {
                    setActivePlatform("reviews")
                    if (isEditing) { closeLinkEditor() } else { openLinkEditor("reviews") }
                  }}
                  className={cn(
                    "flex-1 rounded-2xl border p-4 text-left transition-colors flex flex-col",
                    isEditing
                      ? "border-foreground bg-foreground text-background rounded-b-none border-b-0"
                      : activePlatform === "reviews"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-popover hover:bg-secondary/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-white", meta.color)}>{meta.short}</span>
                      <span className="text-sm font-semibold">{meta.label}</span>
                    </div>
                    {connected ? <CheckCircle2 className="size-4 shrink-0" /> : <Bell className="size-4 shrink-0 opacity-60" />}
                  </div>
                  <div className={cn("mt-2 text-xs", (isEditing || activePlatform === "reviews") ? "text-background/75" : "text-muted-foreground")}>
                    {connected
                      ? (zh ? `已连接 · ${approved}/${total} 可供 agent 使用` : `Connected · ${approved}/${total} agent-available`)
                      : (zh ? "未连接 · 点击添加" : "Not connected · click to add")}
                  </div>
                  {platform?.lastSyncedDisplay && (
                    <div className={cn("mt-2 text-[11px]", (isEditing || activePlatform === "reviews") ? "text-background/60" : "text-muted-foreground/70")}>
                      {zh ? `最后更新：${platform.lastSyncedDisplay}` : `Last update: ${platform.lastSyncedDisplay}`}
                    </div>
                  )}
                </button>
                {isEditing && (
                  <LinkEditorPanel
                    connected={connected}
                    draftLinks={draftLinks}
                    newLinkInput={newLinkInput}
                    onNewLinkChange={setNewLinkInput}
                    onAdd={addDraftLink}
                    onRemove={removeDraftLink}
                    onCancel={closeLinkEditor}
                    onSave={saveDraftLinks}
                    showFileUpload
                    zh={zh}
                  />
                )}
              </div>
            )
          })()}

          {/* Other platforms — 2-col grid */}
          <div className="flex-1 grid gap-3 sm:grid-cols-2">
            {PLATFORM_META.filter((m) => m.key !== "reviews").map((meta) => {
              const platform = platforms.find((p) => p.key === meta.key)
              const connected = Boolean(platform?.connected)
              const total = platform?.items.length ?? 0
              const approved = platform?.items.filter((item) => item.status === "approved" && item.agentAvailable).length ?? 0
              const isEditing = linkEditorKey === meta.key
              return (
                <div key={meta.key} className="flex flex-col gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlatform(meta.key)
                      if (isEditing) { closeLinkEditor() } else { openLinkEditor(meta.key) }
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      isEditing
                        ? "border-foreground bg-foreground text-background rounded-b-none border-b-0"
                        : activePlatform === meta.key
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-popover hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn("flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-white", meta.color)}>{meta.short}</span>
                          <span className="text-sm font-semibold">{meta.label}</span>
                        </div>
                        <div className={cn("mt-2 text-xs", (isEditing || activePlatform === meta.key) ? "text-background/75" : "text-muted-foreground")}>
                          {connected
                            ? (zh ? `已连接 · ${approved}/${total} 可供 agent 使用` : `Connected · ${approved}/${total} agent-available`)
                            : (zh ? "未连接 · 点击添加链接" : "Not connected · click to add links")}
                        </div>
                        {platform?.lastSyncedDisplay && (
                          <div className={cn("mt-1 text-[11px]", (isEditing || activePlatform === meta.key) ? "text-background/60" : "text-muted-foreground/70")}>
                            {zh ? `最后更新：${platform.lastSyncedDisplay}` : `Last update: ${platform.lastSyncedDisplay}`}
                          </div>
                        )}
                      </div>
                      {connected ? <CheckCircle2 className="size-4 shrink-0" /> : <Bell className="size-4 shrink-0 opacity-60" />}
                    </div>
                  </button>
                  {isEditing && (
                    <LinkEditorPanel
                      connected={connected}
                      draftLinks={draftLinks}
                      newLinkInput={newLinkInput}
                      onNewLinkChange={setNewLinkInput}
                      onAdd={addDraftLink}
                      onRemove={removeDraftLink}
                      onCancel={closeLinkEditor}
                      onSave={saveDraftLinks}
                      zh={zh}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Negative theme summary */}
      {negativeThemes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">{zh ? "负面主题聚合" : "Negative Theme Summary"}</h2>
          <p className="text-sm text-muted-foreground -mt-1">{zh ? "点击可筛选下方评价列表。" : "Top issues found in negative reviews. Click to filter the list below."}</p>
          <div className="flex flex-wrap gap-2">
            {negativeThemes.map(([theme, count]) => (
              <button
                key={theme}
                type="button"
                onClick={() => setNegativeThemeFilter((prev) => (prev === theme ? null : theme))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  negativeThemeFilter === theme
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                )}
              >
                {theme} · {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platform detail */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{zh ? "平台详情" : "Platform Detail"}</h2>
        <p className="text-sm text-muted-foreground -mt-1">{zh ? "审核、筛选，并决定哪些内容可被 agent 引用。" : "Review, moderate, and decide what agents can cite."}</p>
        <div className="space-y-4">
          {/* Sync controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
            <div>
              <div className="text-sm font-semibold">
                {PLATFORM_META.find((m) => m.key === activePlatform)?.label ?? "Platform"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {activePlatformData?.lastSyncedDisplay
                  ? (zh ? `上次同步：${activePlatformData.lastSyncedDisplay}` : `Last synced: ${activePlatformData.lastSyncedDisplay}`)
                  : (zh ? "暂无同步记录" : "No sync history")}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoSync((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                  autoSync ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground"
                )}
              >
                {autoSync ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                {zh ? "自动同步" : "Auto-sync"}
              </button>
              <Select value={syncFrequency} onValueChange={(v: "daily" | "weekly" | "monthly") => setSyncFrequency(v)}>
                <SelectTrigger className="h-9 w-[130px] rounded-full bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{zh ? "每天" : "Daily"}</SelectItem>
                  <SelectItem value="weekly">{zh ? "每周" : "Weekly"}</SelectItem>
                  <SelectItem value="monthly">{zh ? "每月" : "Monthly"}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={syncNow}>
                <TrendingUp className="size-3.5" />
                {zh ? "立即同步" : "Sync now"}
              </Button>
            </div>
          </div>

          {/* Content table */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-[minmax(0,2fr)_100px_110px_100px] bg-secondary px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>{zh ? "内容" : "Content"}</div>
              <div>{zh ? "信号" : "Signals"}</div>
              <div>{zh ? "状态" : "Status"}</div>
              <div>Agent</div>
            </div>
            <div className="divide-y divide-border bg-background">
              {(activePlatformData?.items ?? [])
                .filter((item) => !negativeThemeFilter || (item.themes ?? []).includes(negativeThemeFilter))
                .map((item) => (
                  <div key={item.id} className="grid grid-cols-[minmax(0,2fr)_100px_110px_100px] gap-3 px-4 py-4 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.author && <span>{item.author}</span>}
                        <span>{item.publishedAt}</span>
                        {item.product && <span>{item.product}</span>}
                        {item.url !== "#" && (
                          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                            <ExternalLink className="size-3" />
                            open
                          </a>
                        )}
                      </div>
                      {(item.themes ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.themes?.map((theme) => (
                            <Badge key={theme} variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">{theme}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>{item.rating ? `${item.rating}/5 ★` : `${formatNumber(item.likes)} likes`}</div>
                      <div>{item.comments ? `${formatNumber(item.comments)} comments` : "—"}</div>
                      {item.sentiment && <div className="mt-1 capitalize">{item.sentiment}</div>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => mutatePlatformItem(activePlatformData.key, item.id, { status: "approved" })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          item.status === "approved" ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-background"
                        )}
                      >
                        {zh ? "批准" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => mutatePlatformItem(activePlatformData.key, item.id, { status: "rejected", agentAvailable: false })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          item.status === "rejected" ? "border-rose-600 bg-rose-600 text-white" : "border-border bg-background"
                        )}
                      >
                        {zh ? "拒绝" : "Reject"}
                      </button>
                    </div>
                    <div className="flex items-start pt-0.5">
                      <button
                        type="button"
                        onClick={() => mutatePlatformItem(activePlatformData.key, item.id, { agentAvailable: !item.agentAvailable })}
                        disabled={item.status !== "approved"}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                          item.agentAvailable ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground",
                          item.status !== "approved" && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {item.agentAvailable ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {item.agentAvailable ? (zh ? "可引用" : "On") : (zh ? "未启用" : "Off")}
                      </button>
                    </div>
                  </div>
                ))}
              {(activePlatformData?.items ?? []).length === 0 && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  {zh ? "该平台暂无内容。" : "No content for this platform yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductCatalogPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "ugc">("overview")
  const { t, language } = useLanguage()
  const zh = language === "zh"

  const tabs = [
    { id: "overview" as const, label: t("productCatalog.tabOverview") },
    { id: "products" as const, label: t("productCatalog.tabProducts") },
    { id: "ugc"      as const, label: zh ? "UGC 与评价" : "UGC & Reviews" },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <OnboardingBanner />

      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("productCatalog.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("productCatalog.desc")}</p>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-0 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview"  && <OverviewTab onGoToUGC={() => setActiveTab("ugc")} />}
        {activeTab === "products"  && <ProductsTab onConnectFeed={() => {}} />}
        {activeTab === "ugc"       && <UGCReviewsTab />}
      </div>
    </div>
  )
}
