import { useParams } from "react-router-dom"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useChannelState } from "@/lib/channel-state"
import { useLanguage } from "@/lib/language-context"
import { ExternalLink, AlertTriangle, CheckCircle2, XCircle, Zap, TrendingUp, MousePointerClick, ShoppingCart } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ChannelStatus = "always-on" | "active" | "inactive" | "disconnected" | "coming"

interface ChannelConfig {
  name: string
  status: ChannelStatus
  description: string
  icon: string
  longDescription: string
  demoUrl?: string
  docsUrl?: string
  analytics: {
    impressions: string
    clicks: string
    conversions: string
  }
  setupSteps?: string[]
}

const channelConfig: Record<string, ChannelConfig> = {
  "chatgpt-acp": {
    name: "ChatGPT ACP",
    status: "always-on",
    icon: "🤖",
    description: "Agent Commerce Protocol integration with OpenAI's ChatGPT.",
    longDescription: "Your products are automatically discoverable by ChatGPT when shoppers ask shopping-related questions. The Agent Commerce Protocol (ACP) enables ChatGPT to surface your catalog, answer product questions, and facilitate purchases — all without any additional configuration.",
    demoUrl: "#chatgpt-acp-demo",
    docsUrl: "#chatgpt-acp-docs",
    analytics: { impressions: "184,200", clicks: "12,840", conversions: "1,047" },
  },
  "chatgpt-app": {
    name: "ChatGPT App",
    status: "disconnected",
    icon: "💬",
    description: "Direct integration with the ChatGPT mobile and web application.",
    longDescription: "Connect your store directly to the ChatGPT App to enable native in-app shopping experiences. This integration requires access approval from OpenAI and allows your products to appear as native results within the ChatGPT interface.",
    docsUrl: "#chatgpt-app-docs",
    analytics: { impressions: "—", clicks: "—", conversions: "—" },
    setupSteps: [
      "Apply for ChatGPT App merchant access via OpenAI's partner portal.",
      "Once approved, return here and enter your ChatGPT App API credentials.",
      "Configure your product feed preferences and response style.",
      "Run a test query to verify your products appear correctly.",
    ],
  },
  "google-ucp": {
    name: "Google UCP",
    status: "always-on",
    icon: "🔍",
    description: "Google's Universal Commerce Protocol — shop-anywhere search integration.",
    longDescription: "Your catalog is automatically indexed by Google's Universal Commerce Protocol, making products discoverable across Google Search, Google Shopping, and Google's AI-powered shopping features. No manual configuration needed — your Nohi catalog sync handles everything.",
    demoUrl: "#google-ucp-demo",
    docsUrl: "#google-ucp-docs",
    analytics: { impressions: "391,500", clicks: "28,760", conversions: "2,214" },
  },
  "google-ai": {
    name: "Google AI Mode",
    status: "always-on",
    icon: "✨",
    description: "Google AI Overviews and AI Mode shopping results.",
    longDescription: "Products from your catalog can be featured in Google AI Overviews and Google's AI Mode search results. When a shopper's query matches your products, Google may surface them with rich details including price, availability, and a direct purchase path.",
    demoUrl: "#google-ai-demo",
    docsUrl: "#google-ai-docs",
    analytics: { impressions: "256,100", clicks: "19,430", conversions: "1,580" },
  },
  "perplexity": {
    name: "Perplexity",
    status: "always-on",
    icon: "🔮",
    description: "Perplexity AI answer engine with native shopping integration.",
    longDescription: "When Perplexity users ask shopping questions, your products can be featured in the answer engine's results. Perplexity's AI synthesizes product information and links directly to your storefront, driving high-intent traffic.",
    demoUrl: "#perplexity-demo",
    docsUrl: "#perplexity-docs",
    analytics: { impressions: "98,700", clicks: "7,320", conversions: "612" },
  },
  "reddit": {
    name: "Reddit DPA",
    status: "active",
    icon: "🟠",
    description: "Dynamic Product Ads on Reddit, powered by Nohi's catalog sync.",
    longDescription: "Reach Reddit's highly engaged communities with Dynamic Product Ads that automatically pull from your live catalog. Ads are matched to relevant subreddits based on product categories and audience signals, with creative generated from your product images and descriptions.",
    demoUrl: "#reddit-demo",
    docsUrl: "#reddit-docs",
    analytics: { impressions: "72,300", clicks: "4,890", conversions: "324" },
  },
  "third-party": {
    name: "Third Party Agents",
    status: "active",
    icon: "🔗",
    description: "Open API access for third-party AI agents and integrations.",
    longDescription: "Allow external AI agents, shopping assistants, and partner platforms to query your catalog via Nohi's open API. This powers integrations with emerging AI shopping tools, browser extensions, and custom enterprise deployments.",
    demoUrl: "#third-party-demo",
    docsUrl: "#third-party-docs",
    analytics: { impressions: "41,200", clicks: "3,100", conversions: "218" },
  },
  "creator-agents": {
    name: "Creator Agents",
    status: "coming",
    icon: "🎨",
    description: "Empower creators and influencers to build AI storefronts for your brand.",
    longDescription: "Coming soon — Creator Agents will let you authorize content creators to build personalized AI storefronts powered by your catalog. Each creator gets a unique AI shopping experience they can share with their audience.",
    analytics: { impressions: "—", clicks: "—", conversions: "—" },
  },
  "copilot": {
    name: "Microsoft Copilot",
    status: "coming",
    icon: "🪟",
    description: "Shopping integration with Microsoft Copilot across Windows and Edge.",
    longDescription: "Coming soon — your products will be discoverable through Microsoft Copilot in Windows, Edge, and Bing. Reach shoppers across the Microsoft ecosystem with AI-powered product recommendations.",
    analytics: { impressions: "—", clicks: "—", conversions: "—" },
  },
  "genspark": {
    name: "Genspark",
    status: "coming",
    icon: "⚡",
    description: "AI-native search and discovery via Genspark's agent platform.",
    longDescription: "Coming soon — Genspark's AI-first search engine will feature your products in intelligent discovery flows tailored to high-intent shoppers.",
    analytics: { impressions: "—", clicks: "—", conversions: "—" },
  },
  "kimi": {
    name: "Kimi",
    status: "coming",
    icon: "🌙",
    description: "Moonshot AI's Kimi assistant — reaching Chinese-speaking markets.",
    longDescription: "Coming soon — list your products on Kimi, the popular Chinese AI assistant by Moonshot AI, to reach shoppers in China and global Chinese-speaking communities.",
    analytics: { impressions: "—", clicks: "—", conversions: "—" },
  },
  "openclaw": {
    name: "OpenClaw",
    status: "coming",
    icon: "🦞",
    description: "OpenClaw open-source agent framework integration.",
    longDescription: "Coming soon — integrate with OpenClaw's open-source agent framework, enabling developers to build custom AI shopping experiences on top of your catalog.",
    analytics: { impressions: "—", clicks: "—", conversions: "—" },
  },
}

function StatusBadge({ status }: { status: ChannelStatus }) {
  const { t } = useLanguage()
  switch (status) {
    case "always-on":
      return (
        <Badge className="bg-green-600 text-white text-xs gap-1.5">
          <Zap className="size-3" />
          {t("channel.alwaysOn")}
        </Badge>
      )
    case "active":
      return (
        <Badge className="bg-green-600 text-white text-xs">
          {t("channel.active")}
        </Badge>
      )
    case "inactive":
      return (
        <Badge variant="secondary" className="text-xs">
          {t("channel.inactive")}
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="destructive" className="text-xs gap-1.5">
          <XCircle className="size-3" />
          Not Connected
        </Badge>
      )
    case "coming":
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {t("channel.coming")}
        </Badge>
      )
  }
}

export default function GenericChannelPage() {
  const { slug } = useParams<{ slug: string }>()
  const { getChannelStatus, setChannelStatus } = useChannelState()
  const { language, t } = useLanguage()
  const [showDisableWarning, setShowDisableWarning] = useState(false)

  const config = slug ? channelConfig[slug] : undefined

  // Derive the display name even if config is missing
  const displayName = config?.name ?? (slug
    ? slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Channel")

  // Use live channel state for toggleable channels; fall back to config status
  const liveStatus = slug ? getChannelStatus(slug) : undefined
  const configStatus = config?.status ?? "disconnected"

  // For always-on / coming / disconnected we ignore the live toggle state in display
  const isToggleable = configStatus === "active" || configStatus === "inactive" ||
    (liveStatus === "active" || liveStatus === "inactive")
  const isEnabled = liveStatus === "active"

  const handleToggle = (checked: boolean) => {
    if (!checked && isEnabled) {
      setShowDisableWarning(true)
    } else if (slug) {
      setChannelStatus(slug, checked ? "active" : "inactive")
    }
  }

  const confirmDisable = () => {
    if (slug) setChannelStatus(slug, "inactive")
    setShowDisableWarning(false)
  }

  // --- Coming Soon page ---
  if (configStatus === "coming") {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0">
            {config?.icon ?? "📡"}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">{displayName}</h1>
              <StatusBadge status="coming" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config?.description}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-10 flex flex-col items-center text-center gap-4">
          <div className="size-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl">
            {config?.icon ?? "📡"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t("common.comingSoon")}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {config?.longDescription}
            </p>
          </div>
          <Button variant="outline" className="rounded-full mt-2">
            {language === "zh" ? "获取更新通知" : "Notify Me When Available"}
          </Button>
        </div>
      </div>
    )
  }

  // --- Disconnected page ---
  if (configStatus === "disconnected") {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0">
            {config?.icon ?? "📡"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">{displayName}</h1>
              <StatusBadge status="disconnected" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config?.description}</p>
          </div>
          {config?.docsUrl && (
            <a
              href={config.docsUrl}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ExternalLink className="size-3.5" />
              {language === "zh" ? "文档" : "Docs"}
            </a>
          )}
        </div>

        {/* Not connected card */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-6 flex items-start gap-4">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <XCircle className="size-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-foreground">
              {language === "zh" ? "尚未连接" : "Not Connected"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {language === "zh"
                ? "此渠道需要额外设置。请按照以下步骤完成连接。"
                : "This channel requires additional setup. Follow the steps below to get connected."}
            </p>
          </div>
        </div>

        {/* Setup steps */}
        {config?.setupSteps && config.setupSteps.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {language === "zh" ? "设置步骤" : "Setup Guide"}
            </h2>
            <div className="flex flex-col gap-3">
              {config.setupSteps.map((step, i) => (
                <div key={i} className="rounded-2xl bg-secondary/50 bg-popover p-5 flex items-start gap-4">
                  <div className="size-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
          <h3 className="text-base font-medium text-foreground mb-2">
            {language === "zh" ? "关于此渠道" : "About This Channel"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{config?.longDescription}</p>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <Button className="rounded-full">
            {language === "zh" ? "申请访问" : "Request Access"}
          </Button>
          {config?.docsUrl && (
            <Button variant="outline" className="rounded-full gap-2">
              <ExternalLink className="size-4" />
              {language === "zh" ? "查看文档" : "View Docs"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // --- Always-on page ---
  if (configStatus === "always-on") {
    return (
      <>
        <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0">
              {config?.icon ?? "📡"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">{displayName}</h1>
                <StatusBadge status="always-on" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{config?.description}</p>
            </div>
            {config?.demoUrl && (
              <a
                href={config.demoUrl}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ExternalLink className="size-3.5" />
                {language === "zh" ? "演示" : "Demo"}
              </a>
            )}
          </div>

          {/* Always-on status card */}
          <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground">
                  {language === "zh" ? "始终开启" : "Always On"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {language === "zh"
                    ? "此渠道由 Nohi 自动管理，无需手动启用。您的产品目录始终可被发现。"
                    : "This channel is automatically managed by Nohi — no manual activation required. Your catalog is always discoverable."}
                </p>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
            <h3 className="text-base font-medium text-foreground mb-1">
              {language === "zh" ? "渠道分析" : "Channel Analytics"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {language === "zh" ? "过去 30 天的表现数据。" : "Performance data for the last 30 days."}
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <TrendingUp className="size-3.5" />
                  {language === "zh" ? "曝光量" : "Impressions"}
                </div>
                <span className="text-2xl font-semibold text-foreground tabular-nums">
                  {config?.analytics.impressions}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <MousePointerClick className="size-3.5" />
                  {language === "zh" ? "点击量" : "Clicks"}
                </div>
                <span className="text-2xl font-semibold text-foreground tabular-nums">
                  {config?.analytics.clicks}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <ShoppingCart className="size-3.5" />
                  {language === "zh" ? "转化数" : "Conversions"}
                </div>
                <span className="text-2xl font-semibold text-foreground tabular-nums">
                  {config?.analytics.conversions}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
            <h3 className="text-base font-medium text-foreground mb-2">
              {language === "zh" ? "关于此渠道" : "About This Channel"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{config?.longDescription}</p>
          </div>

          {/* Actions */}
          {config?.docsUrl && (
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-full gap-2">
                <ExternalLink className="size-4" />
                {language === "zh" ? "查看文档" : "View Docs"}
              </Button>
            </div>
          )}
        </div>
      </>
    )
  }

  // --- Active / Inactive (toggleable) page ---
  return (
    <>
      <AlertDialog open={showDisableWarning} onOpenChange={setShowDisableWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-lg">{t("channel.disableWarningTitle")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {t("channel.disableWarningDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-full">{t("channel.keepEnabled")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              {t("channel.disableAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0">
            {config?.icon ?? "📡"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">{displayName}</h1>
              <Badge
                variant={isEnabled ? "default" : "secondary"}
                className={cn("text-xs", isEnabled ? "bg-green-600 text-white" : "")}
              >
                {isEnabled ? t("channel.active") : t("channel.inactive")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config?.description}</p>
          </div>
          {config?.demoUrl && (
            <a
              href={config.demoUrl}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ExternalLink className="size-3.5" />
              {language === "zh" ? "演示" : "Demo"}
            </a>
          )}
        </div>

        {/* Status Toggle */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                "size-2.5 rounded-full",
                isEnabled ? "bg-green-500" : "bg-muted-foreground/30"
              )} />
              <div>
                <h3 className="text-base font-medium text-foreground">{t("channel.status")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("channel.enableDisable")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="channel-status" className="text-sm text-muted-foreground">
                {isEnabled ? t("channel.enabled") : t("channel.disabled")}
              </Label>
              <Switch
                id="channel-status"
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={!isToggleable}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
            {t("channel.activationNote")}
          </p>
        </div>

        {/* Analytics */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
          <h3 className="text-base font-medium text-foreground mb-1">
            {language === "zh" ? "渠道分析" : "Channel Analytics"}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {language === "zh" ? "过去 30 天的表现数据。" : "Performance data for the last 30 days."}
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                <TrendingUp className="size-3.5" />
                {language === "zh" ? "曝光量" : "Impressions"}
              </div>
              <span className="text-2xl font-semibold text-foreground tabular-nums">
                {config?.analytics.impressions ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                <MousePointerClick className="size-3.5" />
                {language === "zh" ? "点击量" : "Clicks"}
              </div>
              <span className="text-2xl font-semibold text-foreground tabular-nums">
                {config?.analytics.clicks ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                <ShoppingCart className="size-3.5" />
                {language === "zh" ? "转化数" : "Conversions"}
              </div>
              <span className="text-2xl font-semibold text-foreground tabular-nums">
                {config?.analytics.conversions ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
          <h3 className="text-base font-medium text-foreground mb-2">
            {language === "zh" ? "关于此渠道" : "About This Channel"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{config?.longDescription}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button className="rounded-full">{t("common.save")}</Button>
          {config?.docsUrl && (
            <Button variant="outline" className="rounded-full gap-2">
              <ExternalLink className="size-4" />
              {language === "zh" ? "查看文档" : "View Docs"}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
