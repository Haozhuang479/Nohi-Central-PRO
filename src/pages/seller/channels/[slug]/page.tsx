
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useChannelState } from "@/lib/channel-state"
import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/language-context"

const channelData: Record<string, {
  name: string
  description: { en: string; zh: string }
  features: { en: string[]; zh: string[] }
  type: "toggleable" | "configurable"
  paid?: boolean
}> = {
  "chatgpt-acp": {
    name: "ChatGPT ACP",
    description: {
      en: "Connect to ChatGPT's Agentic Commerce Protocol to enable purchases directly within ChatGPT conversations.",
      zh: "连接 ChatGPT 的智能商务协议，在 ChatGPT 对话中直接启用购买功能。"
    },
    features: {
      en: ["In-chat purchases", "Product recommendations", "Order tracking"],
      zh: ["对话内购买", "产品推荐", "订单跟踪"]
    },
    type: "toggleable"
  },
  "chatgpt-app": {
    name: "ChatGPT App",
    description: {
      en: "Reach shoppers through ChatGPT's mobile and desktop applications with AI-driven product discovery.",
      zh: "通过 ChatGPT 的移动端和桌面端应用触达购物者，实现 AI 驱动的产品发现。"
    },
    features: {
      en: ["Mobile commerce", "Voice shopping", "Visual product cards"],
      zh: ["移动商务", "语音购物", "可视化产品卡片"]
    },
    type: "configurable",
    paid: true
  },
  "google-ucp": {
    name: "Google UCP",
    description: {
      en: "Submit your product feed to Google's Universal Commerce Protocol for enhanced discovery and recommendations.",
      zh: "将您的产品信息提交到 Google 通用商务协议，以增强发现和推荐功能。"
    },
    features: {
      en: ["Google AI integration", "Smart recommendations", "Cross-platform reach"],
      zh: ["Google AI 集成", "智能推荐", "跨平台覆盖"]
    },
    type: "toggleable"
  },
  "google-ai": {
    name: "Google AI Mode",
    description: {
      en: "Enable your products to appear in Google's AI-powered search and shopping experiences.",
      zh: "让您的产品出现在 Google AI 驱动的搜索和购物体验中。"
    },
    features: {
      en: ["AI search results", "Shopping intent matching", "Rich product snippets"],
      zh: ["AI 搜索结果", "购物意图匹配", "丰富的产品摘要"]
    },
    type: "toggleable"
  },
  "perplexity": {
    name: "Perplexity",
    description: {
      en: "List your products on Perplexity's AI search engine for discovery by research-focused shoppers.",
      zh: "在 Perplexity 的 AI 搜索引擎上列出您的产品，供研究型购物者发现。"
    },
    features: {
      en: ["Research-driven discovery", "Detailed product info", "Comparison shopping"],
      zh: ["研究驱动的发现", "详细产品信息", "比较购物"]
    },
    type: "toggleable"
  },
  "copilot": {
    name: "Microsoft Copilot",
    description: {
      en: "Make your products discoverable within Microsoft Copilot's AI-assisted shopping experiences.",
      zh: "让您的产品在 Microsoft Copilot 的 AI 购物体验中可被发现。"
    },
    features: {
      en: ["Copilot shopping", "Windows integration", "Enterprise reach"],
      zh: ["Copilot 购物", "Windows 集成", "企业端覆盖"]
    },
    type: "toggleable"
  },
  "reddit": {
    name: "Reddit",
    description: {
      en: "Connect with Reddit's Dynamic Product Ads to reach engaged community members.",
      zh: "连接 Reddit 的动态产品广告，触达活跃的社区成员。"
    },
    features: {
      en: ["Community targeting", "Interest-based ads", "Authentic engagement"],
      zh: ["社区定向", "兴趣广告", "真实互动"]
    },
    type: "toggleable",
    paid: true
  },
  "gemini": {
    name: "Gemini",
    description: {
      en: "Reach shoppers through Google Gemini's AI assistant with contextual product recommendations.",
      zh: "通过 Google Gemini AI 助手向购物者提供情境化产品推荐。"
    },
    features: {
      en: ["Gemini AI integration", "Contextual ads", "Smart bidding"],
      zh: ["Gemini AI 集成", "情境广告", "智能出价"]
    },
    type: "toggleable",
    paid: true
  },
  "chatgpt": {
    name: "ChatGPT",
    description: {
      en: "Run paid placements within ChatGPT conversations to drive product discovery and purchases.",
      zh: "在 ChatGPT 对话中投放付费广告，推动产品发现和购买。"
    },
    features: {
      en: ["Sponsored placements", "Conversational ads", "Performance tracking"],
      zh: ["赞助位", "对话广告", "效果追踪"]
    },
    type: "toggleable",
    paid: true
  },
  "instagram": {
    name: "Instagram",
    description: {
      en: "Drive product discovery with visually-rich paid placements across Instagram feeds and stories.",
      zh: "通过 Instagram 信息流和故事中的视觉化付费广告推动产品发现。"
    },
    features: {
      en: ["Feed ads", "Story placements", "Shopping tags"],
      zh: ["信息流广告", "故事投放", "购物标签"]
    },
    type: "toggleable",
    paid: true
  },
  "pinterest": {
    name: "Pinterest",
    description: {
      en: "Promote your products to high-intent shoppers browsing Pinterest's visual discovery platform.",
      zh: "向在 Pinterest 视觉发现平台上浏览的高意向购物者推广您的产品。"
    },
    features: {
      en: ["Shopping pins", "Visual search", "Audience targeting"],
      zh: ["购物 Pin", "视觉搜索", "受众定向"]
    },
    type: "toggleable",
    paid: true
  },
  "snapchat": {
    name: "Snapchat",
    description: {
      en: "Reach Gen Z and millennial shoppers through Snapchat's immersive ad formats.",
      zh: "通过 Snapchat 的沉浸式广告格式触达 Z 世代和千禧一代购物者。"
    },
    features: {
      en: ["Dynamic ads", "AR try-on", "Story placements"],
      zh: ["动态广告", "AR 试穿", "故事投放"]
    },
    type: "toggleable",
    paid: true
  },
  "tiktok": {
    name: "TikTok",
    description: {
      en: "Tap into TikTok's short-video commerce to reach trend-driven shoppers at scale.",
      zh: "借助 TikTok 短视频商务，大规模触达趋势驱动的购物者。"
    },
    features: {
      en: ["In-feed ads", "TikTok Shop", "Live commerce"],
      zh: ["信息流广告", "TikTok 小店", "直播电商"]
    },
    type: "toggleable",
    paid: true
  },
  "third-party": {
    name: "Third Party Agents",
    description: {
      en: "Enable access for third-party AI shopping agents and comparison tools.",
      zh: "为第三方 AI 购物智能体和比较工具启用访问权限。"
    },
    features: {
      en: ["Open API access", "Agent marketplace", "Custom integrations"],
      zh: ["开放 API 访问", "智能体市场", "自定义集成"]
    },
    type: "toggleable",
    paid: true
  },
}

export default function ChannelPage() {
  const params = useParams()
  const router = useNavigate()
  const slug = params.slug as string
  
  // Redirect to dedicated page for conversational-storefront
  useEffect(() => {
    if (slug === "conversational-storefront") {
      router.replace("/seller/channels/conversational-storefront")
    }
  }, [slug, router])
  
  // Show loading state while redirecting
  if (slug === "conversational-storefront") {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }
  
  const channel = channelData[slug]
  const { getChannelStatus, setChannelStatus } = useChannelState()
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const { t, language } = useLanguage()

  if (!channel) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h1 className="text-xl font-semibold text-foreground">{t("channel.comingSoon")}</h1>
        <p className="text-sm text-muted-foreground text-center">
          {t("channel.comingSoonDesc")}
        </p>
      </div>
    )
  }

  const currentStatus = getChannelStatus(slug)
  const isEnabled = currentStatus === "active" || currentStatus === "always-on"
  const isActive = isEnabled

  const handleToggle = (checked: boolean) => {
    setChannelStatus(slug, checked ? "active" : "inactive")
  }

  const description = language === "zh" ? channel.description.zh : channel.description.en
  const features = language === "zh" ? channel.features.zh : channel.features.en

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{channel.name}</h1>
            <Badge
              variant="default"
              className={cn(
                "text-xs",
                isActive ? "bg-green-600 text-white" : "bg-secondary text-muted-foreground"
              )}
            >
              {isActive ? t("channel.active") : t("channel.inactive")}
            </Badge>
            {channel.paid && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {t("channel.paid")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* Status Section — Connect with Nohi Agentic Catalog */}
      {channel.type === "toggleable" ? (
        <div className="rounded-2xl bg-secondary/50 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                "size-2.5 rounded-full shrink-0",
                isEnabled ? "bg-green-500" : "bg-muted-foreground/40"
              )} />
              <div>
                <h3 className="text-base font-medium text-foreground">
                  {t("channel.connectAgenticCatalog")}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("channel.connectAgenticCatalogDesc")}
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
              />
            </div>
          </div>
          {!isEnabled && (
            <div className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
              {t("channel.connectAgenticCatalogHint")}
            </div>
          )}
        </div>
      ) : slug === "chatgpt-app" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-secondary/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "size-2.5 rounded-full",
                  currentStatus === "active" ? "bg-green-500" : 
                  currentStatus === "inactive" ? "bg-yellow-500" : "bg-red-500"
                )} />
                <div>
                  <h3 className="text-base font-medium text-foreground">{t("channel.channelStatus")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("channel.enableIntegration")}
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
                />
              </div>
            </div>
          </div>

          {isEnabled && (
            <div className="rounded-2xl bg-secondary/50 p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-medium text-foreground">{t("channel.appSelection")}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("channel.appSelectionDesc")}
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      selectedApp === "custom"
                        ? "border-foreground ring-1 ring-foreground"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedApp("custom")}
                        className="text-left"
                      >
                        <h4 className="text-sm font-medium text-foreground">{t("channel.customApp")}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{t("channel.customAppDesc")}</p>
                      </button>
                      {requestSent ? (
                        <span className="text-xs text-muted-foreground">{t("common.requestSent")}</span>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRequestSent(true)
                          }}
                        >
                          {t("common.request")}
                        </Button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="rounded-xl bg-secondary/30 p-4 text-left opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">{t("channel.nohiApp")}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{t("channel.nohiAppDesc")}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{t("channel.coming")}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-secondary/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                "size-2.5 rounded-full",
                isEnabled ? "bg-green-500" : "bg-yellow-500"
              )} />
              <div>
                <h3 className="text-base font-medium text-foreground">{t("channel.channelStatus")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("channel.configureChannel")}
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
              />
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">{t("channel.features")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-xl bg-secondary/30 p-4"
            >
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Preview - hide for google-ai */}
      {slug !== "google-ai" && (
        <div className="rounded-2xl bg-secondary/50 p-6">
          <h3 className="text-base font-medium text-foreground">{t("channel.channelAnalytics")}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 mb-4">
            {t("channel.performanceMetrics")}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("channel.views")}</span>
              <span className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                {isActive ? "1,247" : "—"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("channel.orders")}</span>
              <span className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                {isActive ? "42" : "—"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("channel.revenue")}</span>
              <span className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                {isActive ? "$3,420" : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="rounded-full">
          {t("channel.saveChanges")}
        </Button>
        <Button variant="outline" className="rounded-full">
          {t("channel.viewDocs")}
        </Button>
      </div>
    </div>
  )
}
