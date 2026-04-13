"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useChannelState } from "@/lib/channel-state"
import { useLanguage } from "@/lib/language-context"
import { ExternalLink, Plus, X, Play, AlertTriangle } from "lucide-react"
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

export default function ConversationalStorefrontPage() {
  const { getChannelStatus, setChannelStatus } = useChannelState()
  const { t, language } = useLanguage()
  const currentStatus = getChannelStatus("conversational-storefront")
  const isEnabled = currentStatus === "active"

  const productCardThemes = [
    { id: "minimal", name: t("storefront.minimal"), description: language === "zh" ? "简洁明了，仅显示基本信息" : "Clean, simple cards with essential info only" },
    { id: "detailed", name: t("storefront.detailed"), description: language === "zh" ? "完整产品详情，包含规格和评价" : "Full product details with specs and reviews" },
    { id: "visual", name: t("storefront.visual"), description: language === "zh" ? "大图展示，文字叠加最小化" : "Large images with minimal text overlay" },
    { id: "compact", name: t("storefront.compact"), description: language === "zh" ? "紧凑布局，适合浏览大量商品" : "Dense layout for browsing many products" },
  ]

  const defaultScenarioQueries = language === "zh" ? [
    "帮我找一个50美元以下送给妈妈的礼物",
    "给我看看适合初学者的跑鞋",
    "家居装饰有什么流行趋势？",
    "比较一下无线耳机",
  ] : [
    "Find me a gift for my mom under $50",
    "Show me running shoes for beginners",
    "What's trending in home decor?",
    "Compare wireless earbuds",
  ]
  
  // Layout version: "split" or "inline"
  const [layoutVersion, setLayoutVersion] = useState<"split" | "inline">("inline")
  
  // Entry points (can combine any)
  const [entryPoints, setEntryPoints] = useState({
    searchAI: true,
    chatBox: true,
    floatingBubble: false,
  })
  
  const [selectedTheme, setSelectedTheme] = useState("minimal")
  const [sellNonOwned, setSellNonOwned] = useState(false)
  const [scenarioQueries, setScenarioQueries] = useState(defaultScenarioQueries)
  const [newQuery, setNewQuery] = useState("")
  const [showDisableWarning, setShowDisableWarning] = useState(false)

  const handleToggle = (checked: boolean) => {
    if (!checked && isEnabled) {
      // Show warning when trying to disable
      setShowDisableWarning(true)
    } else {
      setChannelStatus("conversational-storefront", checked ? "active" : "inactive")
    }
  }

  const confirmDisable = () => {
    setChannelStatus("conversational-storefront", "inactive")
    setShowDisableWarning(false)
  }

  const toggleEntryPoint = (key: keyof typeof entryPoints) => {
    setEntryPoints(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addScenarioQuery = () => {
    if (newQuery.trim() && scenarioQueries.length < 8) {
      setScenarioQueries([...scenarioQueries, newQuery.trim()])
      setNewQuery("")
    }
  }

  const removeScenarioQuery = (index: number) => {
    setScenarioQueries(scenarioQueries.filter((_, i) => i !== index))
  }

  return (
    <>
      {/* Disable Warning Dialog */}
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("storefront.title")}</h1>
            <Badge 
              variant={isEnabled ? "default" : "secondary"}
              className={cn(
                "text-xs",
                isEnabled ? "bg-green-600 text-white" : ""
              )}
            >
              {isEnabled ? t("channel.active") : t("channel.inactive")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("storefront.description")}
          </p>
        </div>
        <a
          href="#demo"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Play className="size-4" />
          {t("storefront.watchDemo")}
        </a>
      </div>

      {/* Channel Status Toggle */}
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
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
          {t("channel.activationNote")}
        </p>
      </div>

      {/* Layout Version Selection */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("storefront.layoutVersion")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("storefront.layoutDesc")}
            </p>
          </div>
          <a
            href="#layout-demo"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ExternalLink className="size-3" />
            {language === "zh" ? "预览布局" : "Preview layouts"}
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Split Screen Option */}
          <button
            type="button"
            onClick={() => setLayoutVersion("split")}
            className={cn(
              "rounded-2xl border bg-popover p-5 text-left transition-all",
              layoutVersion === "split"
                ? "border-foreground ring-1 ring-foreground"
                : "border-border hover:border-foreground/30"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">{t("storefront.splitScreen")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("storefront.splitScreenDesc")}</p>
              </div>
              {layoutVersion === "split" && (
                <div className="size-4 rounded-full bg-foreground shrink-0" />
              )}
            </div>
            {/* Abstract Preview */}
            <div className="aspect-video rounded-lg bg-secondary/50 overflow-hidden flex">
              {/* Chat sidebar */}
              <div className="w-1/3 border-r border-border p-2 flex flex-col gap-1.5">
                <div className="h-2 w-3/4 rounded bg-muted-foreground/20" />
                <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
                <div className="flex-1" />
                <div className="h-6 rounded bg-muted-foreground/10 bg-secondary/50" />
              </div>
              {/* Product grid */}
              <div className="flex-1 p-2 grid grid-cols-3 gap-1.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded bg-muted-foreground/15 aspect-square" />
                ))}
              </div>
            </div>
          </button>

          {/* Inline Option */}
          <button
            type="button"
            onClick={() => setLayoutVersion("inline")}
            className={cn(
              "rounded-2xl border bg-popover p-5 text-left transition-all",
              layoutVersion === "inline"
                ? "border-foreground ring-1 ring-foreground"
                : "border-border hover:border-foreground/30"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">{t("storefront.inlineChat")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("storefront.inlineChatDesc")}</p>
              </div>
              {layoutVersion === "inline" && (
                <div className="size-4 rounded-full bg-foreground shrink-0" />
              )}
            </div>
            {/* Abstract Preview */}
            <div className="aspect-video rounded-lg bg-secondary/50 overflow-hidden flex flex-col relative">
              {/* Product grid */}
              <div className="flex-1 p-2 grid grid-cols-4 gap-1.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded bg-muted-foreground/15 aspect-square" />
                ))}
              </div>
              {/* Bottom floating chat input - more prominent */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[70%]">
                <div className="h-10 rounded-full bg-background border-2 border-foreground/20 shadow-lg flex items-center px-4 gap-2">
                  <div className="h-2 flex-1 rounded bg-muted-foreground/30" />
                  <div className="size-6 rounded-full bg-foreground/80 shrink-0" />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Entry Points */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("storefront.entryPoints")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("storefront.entryPointsDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search AI Mode */}
          <div className={cn(
            "rounded-2xl border bg-popover p-5 transition-all",
            entryPoints.searchAI ? "border-foreground/30" : "border-border"
          )}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">{t("storefront.searchAiMode")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("storefront.searchAiModeDesc")}</p>
              </div>
              <Switch 
                checked={entryPoints.searchAI}
                onCheckedChange={() => toggleEntryPoint("searchAI")}
              />
            </div>
            {/* Abstract Preview */}
            <div className="aspect-[4/3] rounded-lg bg-secondary/50 p-3 flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-full max-w-[80%] rounded-full bg-muted-foreground/10 bg-secondary/50 flex items-center px-3">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mr-2" />
                <div className="h-2 flex-1 rounded bg-muted-foreground/20" />
              </div>
              <div className="text-[10px] text-muted-foreground">
                {language === "zh" ? "AI驱动搜索栏" : "AI-powered search bar"}
              </div>
            </div>
          </div>

          {/* Direct Chat Box */}
          <div className={cn(
            "rounded-2xl border bg-popover p-5 transition-all",
            entryPoints.chatBox ? "border-foreground/30" : "border-border"
          )}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">{t("storefront.chatBox")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("storefront.chatBoxDesc")}</p>
              </div>
              <Switch 
                checked={entryPoints.chatBox}
                onCheckedChange={() => toggleEntryPoint("chatBox")}
              />
            </div>
            {/* Abstract Preview */}
            <div className="aspect-[4/3] rounded-lg bg-secondary/50 p-3 flex flex-col justify-end relative">
              {/* Background content hint */}
              <div className="absolute inset-3 bottom-14 grid grid-cols-3 gap-1.5 opacity-30">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded bg-muted-foreground/20 aspect-square" />
                ))}
              </div>
              {/* Prominent floating input */}
              <div className="relative z-10 h-11 rounded-full bg-background border-2 border-foreground/20 shadow-lg flex items-center px-4 gap-2">
                <div className="h-2.5 flex-1 rounded bg-muted-foreground/30" />
                <div className="size-6 rounded-full bg-foreground shrink-0" />
              </div>
            </div>
          </div>

          {/* Floating Bubble */}
          <div className={cn(
            "rounded-2xl border bg-popover p-5 transition-all",
            entryPoints.floatingBubble ? "border-foreground/30" : "border-border"
          )}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">{t("storefront.floatingBubble")}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("storefront.floatingBubbleDesc")}</p>
              </div>
              <Switch 
                checked={entryPoints.floatingBubble}
                onCheckedChange={() => toggleEntryPoint("floatingBubble")}
              />
            </div>
            {/* Abstract Preview */}
            <div className="aspect-[4/3] rounded-lg bg-secondary/50 p-3 flex items-end justify-end relative">
              <div className="size-10 rounded-full bg-foreground/80 flex items-center justify-center">
                <div className="size-4 rounded-full bg-background/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Default Scenario Queries */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("storefront.scenarioQueries")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("storefront.scenarioQueriesDesc")}
          </p>
        </div>

        <div className="rounded-2xl bg-secondary/50 bg-popover p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {scenarioQueries.map((query, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 bg-secondary rounded-full pl-3 pr-1.5 py-1.5 text-sm"
              >
                <span className="text-foreground">{query}</span>
                <button
                  type="button"
                  onClick={() => removeScenarioQuery(index)}
                  className="p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
          {scenarioQueries.length < 8 && (
            <div className="flex gap-2">
              <Input
                placeholder={t("storefront.addQuery")}
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addScenarioQuery()}
                className="flex-1 rounded-xl"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addScenarioQuery}
                className="rounded-xl shrink-0"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Product Card Theme */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("storefront.cardTheme")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("storefront.cardThemeDesc")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {productCardThemes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSelectedTheme(theme.id)}
              className={cn(
                "rounded-xl border bg-popover p-4 text-left transition-all",
                selectedTheme === theme.id
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{theme.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{theme.description}</p>
                </div>
                {selectedTheme === theme.id && (
                  <div className="size-3 rounded-full bg-foreground shrink-0 mt-0.5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Non-Owned Products Toggle */}
      <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-medium text-foreground">{t("storefront.sellNonOwned")}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("storefront.sellNonOwnedDesc")}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Label htmlFor="sell-non-owned" className="text-sm text-muted-foreground">
              {sellNonOwned ? t("channel.enabled") : t("channel.disabled")}
            </Label>
            <Switch 
              id="sell-non-owned" 
              checked={sellNonOwned}
              onCheckedChange={setSellNonOwned}
            />
          </div>
        </div>
        {sellNonOwned && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {language === "zh" 
                ? "启用后，AI可能会在您的目录旁边推荐Nohi产品数据库中的产品。聊天中的产品卡片将简化为选择选项。"
                : "When enabled, AI may recommend products from the Nohi Product Database alongside your catalog. In-chat product cards will be simplified as selection options."}
            </p>
          </div>
        )}
      </div>

      {/* Analytics Preview */}
      <div className="rounded-2xl bg-secondary/50 bg-popover p-6">
        <h3 className="text-base font-medium text-foreground">
          {language === "zh" ? "渠道分析" : "Channel Analytics"}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5 mb-4">
          {language === "zh" ? "您的对话式店面的表现指标。" : "Performance metrics for your conversational storefront."}
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {language === "zh" ? "对话数" : "Conversations"}
            </span>
            <span className="text-2xl font-semibold text-foreground tabular-nums mt-1">2,847</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {language === "zh" ? "订单数" : "Orders"}
            </span>
            <span className="text-2xl font-semibold text-foreground tabular-nums mt-1">124</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {language === "zh" ? "收入" : "Revenue"}
            </span>
            <span className="text-2xl font-semibold text-foreground tabular-nums mt-1">$8,920</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="rounded-full">
          {t("common.save")}
        </Button>
        <Button variant="outline" className="rounded-full">
          {language === "zh" ? "预览店面" : "Preview Storefront"}
        </Button>
        <a
          href="#demo-video"
          className="ml-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Play className="size-4" />
          {language === "zh" ? "观看完整演示" : "Watch full demo"}
        </a>
      </div>
    </div>
    </>
  )
}
