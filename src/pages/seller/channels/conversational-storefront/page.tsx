
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useChannelState } from "@/lib/channel-state"
import { useLanguage } from "@/lib/language-context"
import { ExternalLink } from "lucide-react"

export default function ConversationalStorefrontPage() {
  const { getChannelStatus, setChannelStatus } = useChannelState()
  const { t, language } = useLanguage()
  const currentStatus = getChannelStatus("conversational-storefront")
  const isEnabled = currentStatus === "active"

  // Layout version: "split" or "inline"
  const [layoutVersion, setLayoutVersion] = useState<"split" | "inline">("inline")
  
  // Entry points (can combine any)
  const [entryPoints, setEntryPoints] = useState({
    searchAI: true,
    chatBox: true,
    floatingBubble: false,
  })
  
  const handleToggle = (checked: boolean) => {
    setChannelStatus("conversational-storefront", checked ? "active" : "inactive")
  }

  const toggleEntryPoint = (key: keyof typeof entryPoints) => {
    setEntryPoints(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("storefront.title")}</h1>
            <Badge
              variant="default"
              className={cn(
                "text-xs",
                isEnabled ? "bg-green-600 text-white" : "bg-secondary text-muted-foreground"
              )}
            >
              {isEnabled ? t("channel.active") : t("channel.inactive")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("storefront.description")}
          </p>
        </div>
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

        <div className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-4">
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



      {/* Actions */}
      <div className="flex gap-3">
        <Button className="rounded-full">
          {t("common.save")}
        </Button>
        <Button variant="outline" className="rounded-full">
          {language === "zh" ? "预览店面" : "Preview Storefront"}
        </Button>

      </div>
    </div>
  )
}
